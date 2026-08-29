# Earlydays Nursery & Primary School — website

Next.js 14 (App Router) · TypeScript · Tailwind CSS · npm

## Run it

```bash
npm install
npm run dev
```

Open http://localhost:3000

## Environment setup (Firebase + Paystack)

The parent portal (login, children, payment history) runs on Firebase Auth
+ Firestore, and fee payments run on Paystack. Both are wired to
placeholder values out of the box so the app boots without any setup, but
real sign-in and payments won't work until you provide real credentials.

1. Copy `.env.example` to `.env.local`.
2. Fill in the Firebase client config from **Firebase Console → Project
   settings → General → Your apps → Web app**.
3. Fill in the Firebase Admin credentials from **Firebase Console → Project
   settings → Service accounts → Generate new private key**. Paste the
   `private_key` value as-is (its `\n` line breaks are un-escaped in
   `lib/firebase/admin.ts`).
4. Fill in your Paystack keys from **Paystack Dashboard → Settings → API
   Keys & Webhooks**. Point a Paystack webhook at
   `https://<your-domain>/api/paystack/webhook` so payments still confirm
   even if a parent closes the tab before the in-page verification call
   completes.
5. Review `firestore.rules` before going live — it's a minimal starting
   point (parents can only read/write their own document; payment writes
   only happen server-side), not a full security audit.
6. Each parent needs a `parents/{uid}` Firestore document (matching their
   Firebase Auth UID) before the portal or payment flow will show any
   data — see `lib/firebase/types.ts` for the shape. There's no self-serve
   signup; accounts and child records are expected to be created by the
   school.

## Tests

```bash
npm test           # Vitest — component behavior, admin API routes, auth, and payment flows (all mocked)
npm run test:watch
npm run typecheck   # tsc --noEmit
npm run test:e2e    # Playwright smoke test across all routes (starts the dev server automatically)
```

Playwright needs browser binaries installed once via `npx playwright
install`. Vitest tests don't touch real Firebase/Paystack — Firestore,
Storage, and outbound Paystack calls are all mocked; they test route
logic and component behavior only.

## Structure

```
app/
  page.tsx                Home
  journey/page.tsx         The Pathway visualizer + Day in the Life
  safety/page.tsx          Safety & Trust, Meet the Teachers, Campus Tour teaser
  gallery/page.tsx         Full campus photo gallery (filterable, with lightbox)
  admissions/page.tsx      Fees table, prospectus download, online payment
  admissions/apply/page.tsx Application form
  events/page.tsx          Term dates & events calendar (reads the admin-managed calendar)
  blog/page.tsx            Blog index
  blog/[slug]/page.tsx     Individual blog post (statically generated)
  portal/page.tsx          Parent portal (Firebase Auth login + Firestore dashboard)
  contact/page.tsx         Contact details
  not-found.tsx            Custom 404 page
  error.tsx                Custom error boundary

  admin/                   Staff-only pages, gated by AuthProvider + Firebase Auth
                            (announcements, applications, events, inquiries,
                            parents, reports — one page per resource)

  api/admin/                CRUD routes backing the admin pages above, one
                            subfolder per resource; every handler is wrapped in
                            withAdminRoute (lib/firebase/admin-auth.ts), which
                            enforces auth and centralizes error handling
  api/admissions/apply/      Public application-form submission
  api/contact/               Public contact-form submission
  api/cron/fee-reminders/    Weekly cron (see vercel.json), guarded by CRON_SECRET
  api/paystack/              Server routes: initialize, verify, webhook

components/                All reusable, presentational pieces — marketing
                            (Navbar, Footer, PathwayVisualizer, DayInLife,
                            FeesTable, ...), the parent portal (Portal*), and
                            admin CRUD panels (Admin*List / Admin*Panel)

lib/data.ts                 Single source of truth for all static site content —
                            edit this file to update copy, fees, staff,
                            blog posts, and the WhatsApp number everywhere at once.

lib/firebase/                Firebase client/admin init, AuthProvider,
                            Firestore data types (parents, children, payments),
                            and admin-auth.ts (requireAdminEmail / withAdminRoute).

lib/api/errors.ts            Shared route-handler error wrapper (withRouteErrorHandling) —
                            logs and returns a generic 500 for anything an
                            API route doesn't handle itself.

lib/fees.ts                  Static fee-bracket definitions (labels, ages,
                            which stage codes share a price). Actual prices
                            are admin-editable and Firestore-backed — see
                            lib/feeSettings.ts.

lib/feeSettings.ts           Firestore-backed termly fee amounts, editable
                            from /admin (Fee schedule). Used server-side by
                            the Paystack initialize route, the fee-reminder
                            cron job, and the public /admissions fee table
                            — never trusts a client-submitted amount.

lib/rate-limit.ts            In-memory rate limiting for the public contact
                            and admissions/apply forms.

test/, e2e/                  Vitest unit tests (component behavior, admin API
                            routes, auth, payments) and Playwright smoke tests.
```

## Before you launch — replace these

1. **`lib/data.ts` → `site.whatsapp`** — swap in the real WhatsApp number (digits only, country code first, no `+`).
2. ~~`lib/fees.ts` → `FEE_BY_STAGE`~~ — done: termly fees are now admin-editable (`/admin` → Overview → Fee schedule) instead of a code edit. `lib/fees.ts` keeps only the static bracket definitions (labels/ages/which stage codes share a price); real amounts live in Firestore via `lib/feeSettings.ts` and start out at the same sample figures until an admin sets real ones.
3. **`components/ProspectusCard.tsx`** — points to `/prospectus.pdf`; a placeholder PDF ships in `/public/prospectus.pdf` — replace it with the real prospectus.
4. **`components/TeacherGrid.tsx` / `lib/data.ts` → `teachers`** — swap placeholder initials for real staff photos (add an `<Image>` per teacher once photos exist).
5. ~~`components/GalleryGrid.tsx` / `lib/data.ts` → `galleryCells`~~ — done: real campus photography now lives in `lib/data.ts` → `galleryImages`, with a full `/gallery` page (`components/Gallery.tsx`) and a teaser grid on the Safety page.
6. **Firebase + Paystack** — see "Environment setup" above; nothing here is live until real credentials are provided.
7. **`lib/data.ts` → `site.url`** — placeholder domain; the sitemap, `robots.txt`, and OpenGraph/canonical links all resolve off this, so they won't be correct until it's the real production domain.

## Design tokens

Colors, fonts, and radii live in `tailwind.config.ts`. Fonts (Inter) are loaded via `next/font/google` in `app/layout.tsx` — no external font requests at runtime.
