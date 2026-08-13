# Earlydays Nursery & Primary School — website

Next.js 14 (App Router) · TypeScript · Tailwind CSS · pnpm

## Run it

```bash
pnpm install
pnpm dev
```

Open http://localhost:3000

## Structure

```
app/
  page.tsx              Home
  journey/page.tsx       The Pathway visualizer + Day in the Life
  safety/page.tsx         Safety & Trust, Meet the Teachers, Campus Gallery
  admissions/page.tsx     Fees table, prospectus download, online payment
  events/page.tsx         Term dates & events calendar
  blog/page.tsx           Blog index
  blog/[slug]/page.tsx    Individual blog post (statically generated)
  portal/page.tsx         Parent portal login (UI demo)
  contact/page.tsx        Contact details

components/               All reusable, presentational pieces (Navbar, Footer,
                           PathwayVisualizer, DayInLife, FeesTable, etc.)

lib/data.ts                Single source of truth for all site content —
                           edit this file to update copy, fees, events, staff,
                           blog posts, and the WhatsApp number everywhere at once.
```

## Before you launch — replace these

1. **`lib/data.ts` → `site.whatsapp`** — swap in the real WhatsApp number (digits only, country code first, no `+`).
2. **`lib/data.ts` → `fees`** — sample Naira figures, replace with the confirmed fee schedule.
3. **`components/ProspectusCard.tsx`** — points to `/prospectus.pdf`; drop the real file into `/public/prospectus.pdf`.
4. **`components/TeacherGrid.tsx` / `lib/data.ts` → `teachers`** — swap placeholder initials for real staff photos (add an `<Image>` per teacher once photos exist).
5. **`components/GalleryGrid.tsx` / `lib/data.ts` → `galleryCells`** — swap gradient placeholder tiles for real campus photography.
6. **`components/PayPanel.tsx`** — currently shows an alert; connect the button to a live Paystack Payment Link or Checkout session.
7. **`components/PortalLoginForm.tsx`** — UI only; connect to real authentication and student records.

## Design tokens

Colors, fonts, and radii live in `tailwind.config.ts`. Fonts (Fraunces, Manrope, IBM Plex Mono) are loaded via `next/font/google` in `app/layout.tsx` — no external font requests at runtime.
