#!/usr/bin/env node
// Warns (never fails the build) about missing production env vars, since a
// misconfigured Vercel deploy would otherwise only surface at first request
// (Firebase/Paystack clients init lazily) or as a silent placeholder shown
// to real visitors (site contact info in lib/data.ts). Only runs its checks
// on a Vercel production build — VERCEL_ENV is unset locally and in CI, so
// this is a no-op everywhere else.

if (process.env.VERCEL_ENV !== "production") {
  process.exit(0);
}

const REQUIRED = {
  "Firebase client config": [
    "NEXT_PUBLIC_FIREBASE_API_KEY",
    "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN",
    "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
    "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET",
    "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID",
    "NEXT_PUBLIC_FIREBASE_APP_ID",
  ],
  "Firebase Admin SDK": ["FIREBASE_ADMIN_PROJECT_ID", "FIREBASE_ADMIN_CLIENT_EMAIL", "FIREBASE_ADMIN_PRIVATE_KEY"],
  Paystack: ["NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY", "PAYSTACK_SECRET_KEY"],
  "Site contact info (see the 'before you launch' checklist in README.md)": [
    "NEXT_PUBLIC_WHATSAPP_NUMBER",
    "NEXT_PUBLIC_CONTACT_PHONE",
    "NEXT_PUBLIC_CONTACT_EMAIL",
    "NEXT_PUBLIC_SITE_URL",
  ],
  "Cron auth": ["CRON_SECRET"],
};

const missingByGroup = Object.entries(REQUIRED)
  .map(([group, names]) => [group, names.filter((name) => !process.env[name]?.trim())])
  .filter(([, missing]) => missing.length > 0);

if (missingByGroup.length === 0) {
  console.log("[validate-env] All checked production env vars are set.");
  process.exit(0);
}

console.warn(
  "\n⚠️  [validate-env] This production build is missing env vars below — the affected " +
    "features will show placeholders or fail at request time, not at build time:\n"
);
for (const [group, missing] of missingByGroup) {
  console.warn(`  ${group}:`);
  for (const name of missing) console.warn(`    - ${name}`);
}
console.warn("\nSet these in the Vercel project's Settings → Environment Variables (Production) as needed.\n");

process.exit(0);
