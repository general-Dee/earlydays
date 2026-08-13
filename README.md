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
npm test          # Vitest unit tests (PathwayVisualizer, DayInLife)
npm run test:watch
npm run test:e2e   # Playwright smoke test across all routes (starts the dev server automatically)
```

Playwright needs browser binaries installed once via `npx playwright
install`. Unit tests don't touch Firebase/Paystack — they test component
behavior only.

## Structure

```
app/
  page.tsx                Home
  journey/page.tsx         The Pathway visualizer + Day in the Life
  safety/page.tsx          Safety & Trust, Meet the Teachers, Campus Gallery
  admissions/page.tsx      Fees table, prospectus download, online payment
  events/page.tsx          Term dates & events calendar
  blog/page.tsx            Blog index
  blog/[slug]/page.tsx     Individual blog post (statically generated)
  portal/page.tsx          Parent portal (Firebase Auth login + Firestore dashboard)
  contact/page.tsx         Contact details
  not-found.tsx            Custom 404 page
  error.tsx                Custom error boundary
  api/paystack/            Server routes: initialize, verify, webhook

components/                All reusable, presentational pieces (Navbar, Footer,
                            PathwayVisualizer, DayInLife, FeesTable, etc.)

lib/data.ts                 Single source of truth for all static site content —
                            edit this file to update copy, fees, events, staff,
                            blog posts, and the WhatsApp number everywhere at once.

lib/firebase/                Firebase client/admin init, AuthProvider, and
                            Firestore data types (parents, children, payments).

lib/fees.ts                  Per-stage termly fee amounts used by the
                            Paystack initialize route (server-side, never
                            trusts a client-submitted amount).

test/, e2e/                  Vitest unit tests and Playwright smoke tests.
```

## Before you launch — replace these

1. **`lib/data.ts` → `site.whatsapp`** — swap in the real WhatsApp number (digits only, country code first, no `+`).
2. **`lib/fees.ts` → `FEE_BY_STAGE`** — sample Naira figures, replace with the confirmed fee schedule (keep `lib/data.ts` → `fees` in sync for the fees table display).
3. **`components/ProspectusCard.tsx`** — points to `/prospectus.pdf`; a placeholder PDF ships in `/public/prospectus.pdf` — replace it with the real prospectus.
4. **`components/TeacherGrid.tsx` / `lib/data.ts` → `teachers`** — swap placeholder initials for real staff photos (add an `<Image>` per teacher once photos exist).
5. **`components/GalleryGrid.tsx` / `lib/data.ts` → `galleryCells`** — swap gradient placeholder tiles for real campus photography.
6. **Firebase + Paystack** — see "Environment setup" above; nothing here is live until real credentials are provided.

## Design tokens

Colors, fonts, and radii live in `tailwind.config.ts`. Fonts (Fraunces, Manrope, IBM Plex Mono) are loaded via `next/font/google` in `app/layout.tsx` — no external font requests at runtime.
