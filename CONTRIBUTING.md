# Contributing

This covers workflow and conventions for working on this codebase. For how to
run the app, set up environment variables, and run the test suite, see
[README.md](README.md) — this doc doesn't repeat any of that.

## Before you push

`npm install` sets up a Husky pre-commit hook (via `lint-staged`) that runs
`eslint --fix` on staged files — nothing extra to configure.

CI (`.github/workflows/ci.yml`) runs, in order, on every push/PR to `master`:

```
lint → typecheck → test → test:rules → build → test:e2e
```

That sequence is the actual gate. Running `npm run lint && npm run typecheck
&& npm test` locally before pushing catches most of it early, well before a
slower emulator- or build-dependent step would.

## Conventions actually enforced in this codebase

These aren't style preferences — each one is either checked by CI or is the
established pattern every existing route/component follows.

- **Every `app/api/admin/**/route.ts` handler must be wrapped** in
  `withAdminRoute(area, route, handler)` or `withSuperAdminRoute(route,
  handler)` (`lib/firebase/admin-auth.ts`). `test/admin-routes-wrapped.test.ts`
  statically scans every admin route file and fails CI if an exported HTTP
  handler doesn't reference one of these wrappers.
- **Public and portal routes** wrap their handler in `withRouteErrorHandling`
  (`lib/api/errors.ts`) directly — it catches anything unhandled and returns a
  clean 500 instead of leaking a stack trace.
- **Rate-limit mutating routes** via `checkRateLimit(key, { max, windowMs })`
  (`lib/rate-limit.ts`). Public routes key by IP (`getClientIp(req)`); admin
  routes key by the actor's email.
- **Validation**: the two highest-traffic public routes (`contact`,
  `admissions/apply`) use a colocated zod schema in a `validation.ts` file
  next to the route (e.g. `app/api/contact/validation.ts`) — follow that
  pattern for new public routes. Everything else still uses the hand-rolled
  `validateRequiredString` helper (`lib/validation.ts`); migrating the rest to
  zod is an incremental, not-yet-finished effort.
- **Audit anything worth a trail** by calling `logAdminAction({ action,
  actorEmail, ... })` (`lib/audit.ts`). It's best-effort — it swallows and logs
  its own errors — so it never blocks or fails the action it's recording.
- **Never `console.error` a raw error object or user-submitted data.** Use
  `logRouteError` / `handleRouteError` (`lib/api/errors.ts`), which logs only
  `{name, message, stack}` with email/phone-shaped substrings redacted from
  the message (`lib/redact.ts`) and forwards to Sentry.
- **Always reference Firestore collection names via the `COLLECTIONS`
  constant** (`lib/firebase/collections.ts`), never a string literal —
  it's the single place collection names are defined.

## Recipe: adding a new admin-managed resource

This exact shape already repeats about ten times (blog, gallery, events,
staff, testimonials, faqs, announcements, subscribers, inquiries, parents).
Adding another one means:

1. A type in `lib/firebase/types.ts`.
2. An entry in `COLLECTIONS` (`lib/firebase/collections.ts`).
3. CRUD routes under `app/api/admin/<resource>/`, each wrapped in
   `withAdminRoute`, plus a colocated `validation.ts`.
4. An `Admin<Resource>List` or `Admin<Resource>Panel` component
   (`components/`).
5. A nav entry and page under `app/admin/<resource>/`.
6. If it needs its own permission scope separate from existing areas, an
   entry in the `ADMIN_AREAS` union (`lib/firebase/types.ts`).

Picking any existing resource (e.g. `blog`) as a reference implementation
covers all six steps concretely.

## Testing conventions

- `npx vitest run` is the full unit/component/route suite (mocked
  Firebase/Paystack throughout).
- A handful of tests are known to show up as flaky **only under full-suite
  load** — always as `Test timed out in 5000ms` (seen most often in
  `admin-blog-patch.test.ts` and `admin-staff-patch.test.ts`, occasionally
  elsewhere). This is resource contention between tests running in parallel,
  not a real regression. If a full run shows only timeout failures like this,
  re-run the specific file in isolation to confirm before treating it as a
  real problem.
- `firestore.rules` / `storage.rules` tests are **excluded** from the default
  `vitest run` — use `npm run test:rules`, which spins up the Firebase
  emulator.
- `npm run test:e2e` is also emulator-backed, for the one flow
  (`e2e/admissions.spec.ts`) that writes real data end-to-end rather than
  mocking the network.

## Further reading

- [`docs/architecture.md`](docs/architecture.md) — data model, auth model,
  request/payment lifecycles, and the reasoning behind a few non-obvious
  design choices.
- [`docs/admin-access-migration.md`](docs/admin-access-migration.md) —
  runbook for migrating an env-var admin into a real Firestore `adminUsers`
  record.
- [`docs/firestore-backups.md`](docs/firestore-backups.md) — the automated
  weekly Firestore export and how to restore from one.
