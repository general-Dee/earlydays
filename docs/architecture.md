# Architecture

A conceptual tour of how this app is built — the data model, the auth model,
and the shape of a typical request. For a file-tree walkthrough see
[README.md](../README.md)'s "Structure" section; for workflow and coding
conventions see [CONTRIBUTING.md](../CONTRIBUTING.md).

## Overview

Next.js 14 (App Router), hosted on Vercel. Firebase — Firestore, Auth, and
Storage — is the only backend; there's no SQL database or ORM. Payments run
through Paystack. Notifications go out over Resend (email), the WhatsApp
Cloud API, and Termii (SMS). Scheduled work runs via Vercel Cron.

## Data model

The Firestore collections, one line each (`COLLECTIONS` in
`lib/firebase/collections.ts` is the single source of truth for names;
`lib/firebase/types.ts` is the source of truth for shapes — this is
orientation, not a schema dump):

- **`parents`** — one document per parent account (`Parent`), keyed by their
  Firebase Auth uid. Has a `payments` subcollection per parent
  (`paths.payments(uid)`).
- **`applications`** — admissions applications (`Application`), looked up
  publicly by `referenceCode`.
- **`inquiries`** — contact-form submissions (`Inquiry`).
- **`events`** — the term calendar (`CalendarEvent`), with an `rsvps`
  subcollection per event (`paths.eventRsvps(eventId)`).
- **`announcements`, `staff`, `blog`, `gallery`, `testimonials`, `faqs`** —
  admin-editable marketing/content collections, each with the same
  `createdBy`/`createdAt`/`updatedAt` shape.
- **`subscribers`** — newsletter signups.
- **`settings`** — a single site-settings document (contact info, fee
  figures) edited from `/admin`.
- **`adminUsers`** — the RBAC source of truth (see below).
- **`auditLog`** — one entry per audited admin action (`lib/audit.ts`).
- **`cronRuns`** / **`notificationFailures`** — outcomes of scheduled jobs and
  individual notification-send failures, respectively.
- **`rateLimits`** — request-counting buckets for `checkRateLimit`.

## Auth & authorization model

Three tiers:

1. **Public** — no auth. Contact form, admissions application, newsletter
   signup, application-status lookup.
2. **Portal** — Firebase Auth. A parent can only read/write their own
   `parents/{uid}` document; enforced by `firestore.rules`, not by
   application code.
3. **Admin** — Firebase Auth *plus* an entry in `adminUsers`.

Admin identity resolution (`resolveAdminIdentity()` in
`lib/firebase/admin-auth.ts`) is checked in this order:

1. If the Firebase Auth user is disabled, deny — checked first, so this
   applies even to an env-var-fallback admin (see below).
2. If an `adminUsers/{uid}` document exists: a `revoked` tombstone denies
   unconditionally and permanently — a revoked admin can't be resurrected by
   also matching the env-var fallback. Otherwise, the document's
   `isSuperAdmin`/`areas` decide access.
3. If no document exists yet, fall back to the `ADMIN_EMAILS` /
   `ADMIN_EMAILS_<AREA>` env vars — a deliberate, permanent bootstrap and
   break-glass path (see "Notable constraints" below), not legacy scaffolding.

`ADMIN_AREAS` (`lib/firebase/types.ts`) is the fixed list of permission scopes
(e.g. `applications`, `payments`, `staff`); an admin is either a superadmin
(all areas) or scoped to specific ones. Every admin route enforces this via
`withAdminRoute(area, ...)` or `withSuperAdminRoute(...)`
(`lib/firebase/admin-auth.ts`) — and `test/admin-routes-wrapped.test.ts`
CI-checks that no route skips this.

## Request lifecycle

The common shape of a mutating route — rate limit → validate → write →
audit → notify → respond — worked example in
`app/api/admin/parents/[uid]/route.ts`:

1. Rate-limit check (`checkRateLimit`).
2. Parse and validate the request body.
3. Write to Firestore (and, for parent/admin accounts, the Firebase Auth
   user record).
4. `logAdminAction(...)` on admin routes — best-effort, never blocks the
   response.
5. Best-effort notification send (email/WhatsApp/SMS) — failures are logged
   and recorded (see "Cron jobs" below), never surfaced as a failed response.
6. JSON response.

## Payment lifecycle

1. `POST /api/paystack/initialize` creates a pending payment record and a
   Paystack checkout session.
2. The parent completes checkout in Paystack's UI.
3. **The webhook** (`app/api/paystack/webhook/route.ts`) is the system of
   record: it verifies the Paystack signature (HMAC-SHA512, compared with
   `timingSafeEqual`) and applies an idempotent status transition.
4. An in-page `POST /api/paystack/verify` call is a UX convenience for a
   parent who stays on the tab — not the source of truth.
5. `POST /api/admin/payments/[reference]` gives an admin a manual re-verify
   action, for the rare case where the webhook itself is missed (network
   blip, Paystack outage) and a payment is stuck `"pending"`.

`PaymentStatus` is `"pending" | "success" | "failed"`.

## Cron jobs

Three jobs, defined in `vercel.json` and gated by `CRON_SECRET`:

- `fee-reminders` — weekly.
- `event-reminders` — daily.
- `firestore-backup` — weekly, triggers a managed Firestore export (see
  `docs/firestore-backups.md`).

Each run writes one `cronRuns` document with aggregate counts. Individual
notification-send failures (a specific recipient/channel) are additionally
recorded in `notificationFailures`, visible at `/admin/notification-failures`
— this is what lets an admin see *which* fee reminder silently failed to
send, not just that some of them did.

## Error handling & observability

`withRouteErrorHandling` (`lib/api/errors.ts`) wraps every route handler,
catching anything unhandled and returning a generic 500 instead of leaking
detail. It logs `{name, message, stack}` — the message has email/phone-shaped
substrings redacted (`lib/redact.ts`) before logging; the stack is passed
through unredacted, since it's source file/line locations, not user data.
Errors also forward to Sentry (`@sentry/nextjs`), which no-ops until
`NEXT_PUBLIC_SENTRY_DSN` is set. The same redaction is applied to
`NotificationFailure.reason`.

## Testing architecture

- **Vitest** — unit/component/route-logic tests, with Firebase and Paystack
  fully mocked.
- **`test:rules`** — `firestore.rules`/`storage.rules` tests against the
  Firebase emulator.
- **`test:e2e`** — Playwright, also emulator-backed for the one flow that
  writes real data end-to-end (admissions submission).

CI runs all of these in sequence: `lint → typecheck → test → test:rules →
build → test:e2e`.

## Notable constraints

A few things that look like they could be "fixed" but are deliberate:

- **No SQL joins** — Firestore has no cross-collection query, so some reads
  are denormalized by design (e.g. a payment record stores `childName`
  directly rather than joining against the parent's `children` array).
- **`checkRateLimit` is Firestore-transaction-based, not in-memory** —
  because Vercel serverless functions don't share memory across instances, an
  in-memory counter would only limit requests hitting the same warm instance.
  Its buckets never expire on their own; a TTL policy needs to be set on
  `rateLimits.resetAt` in the Firebase Console.
- **The `ADMIN_EMAILS`/`ADMIN_EMAILS_<AREA>` env-var fallback is permanent by
  design**, not a bootstrap step meant to be removed later — it's the
  documented break-glass path if Firestore or the admin-management UI itself
  is ever broken (`admin-auth.ts`).
