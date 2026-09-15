# Firestore Backups

A weekly automated backup of the entire Firestore database, via `GET /api/cron/firestore-backup`
(Vercel Cron, Sundays at 3am UTC — see `vercel.json`). It calls Firestore's managed export API,
which writes a full export straight to the existing Firebase Storage bucket
(`NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`) under `firestore-backups/<timestamp>/` — no new
infrastructure, and it reuses the same service account already configured for
`FIREBASE_ADMIN_CLIENT_EMAIL`/`FIREBASE_ADMIN_PRIVATE_KEY`.

## One-time setup (required before this works)

The route will run every week regardless, but every attempt will fail with a permissions error
until you do this once:

1. Go to [console.cloud.google.com](https://console.cloud.google.com) and select the Firebase
   project (same project as `FIREBASE_ADMIN_PROJECT_ID`).
2. Go to **IAM & Admin → IAM**.
3. Find the service account matching `FIREBASE_ADMIN_CLIENT_EMAIL` (something like
   `firebase-adminsdk-xxxxx@<project-id>.iam.gserviceaccount.com`).
4. Click the pencil/edit icon on that row → **Add another role**.
5. Search for and select **Cloud Datastore Import Export Admin**
   (`roles/datastore.importExportAdmin`). This is the one permission Firebase's default service
   account roles don't already include — it's what actually allows triggering an export.
6. Save.

If exports still fail afterward with a storage permissions error (unlikely, since this is the
same bucket the service account already writes to for Storage), also grant **Storage Object
Admin** (`roles/storage.objectAdmin`) on the same service account as a fallback.

**Also check your Vercel plan's cron limits.** This is the third cron job in `vercel.json`
(alongside `fee-reminders` and `event-reminders`) — Vercel's plans have historically limited how
many cron jobs and how frequently they can run on lower tiers. If this third job silently doesn't
fire, check your plan's cron allowance in the Vercel dashboard.

## Verifying it worked

Any of these:

- **Admin → Cron Runs** (`/admin/cron-runs`, superadmin only) — a `firestore-backup` entry should
  appear weekly, with `exportRequested: 1` and `failures: 0`. A `failures: 1` entry means the
  request itself failed (check the Vercel function logs / Sentry for the specific error — almost
  always the IAM grant above, if this is the first run).
- **Firebase Console → Firestore Database → Import/Export tab** — lists every export operation
  and its actual completion status (the cron route only confirms the *request* succeeded, not
  that the export finished — Google's export operation runs asynchronously after that).
- **The GCS bucket directly** (Cloud Console → Cloud Storage → your bucket →
  `firestore-backups/`) — each run creates a new timestamped folder once the export completes.

## Restoring from a backup

Deliberately a manual, CLI-driven procedure — not a button in the admin panel. A restore replaces
live data and should never be one click away from an admin session:

```sh
# Requires the gcloud CLI, authenticated as someone with Firestore admin access
# on this project (gcloud auth login), and the exact backup path/timestamp
# you intend to restore (see "Verifying it worked" above to find one).
gcloud firestore import gs://<your-bucket>/firestore-backups/<timestamp> --project=<project-id>
```

This overwrites documents in the collections present in the export. Notes:

- Firestore import does **not** delete documents that were created *after* the backup and aren't
  in it — it's a merge, not a wipe-and-restore. If you need a clean restore to exactly the
  backed-up state, delete the affected collections first (carefully, and only if you're certain).
- There's no automated retention/cleanup of old backups in this bucket — they accumulate over
  time. If storage cost becomes a concern, set a
  [GCS Object Lifecycle rule](https://cloud.google.com/storage/docs/lifecycle) on the
  `firestore-backups/` prefix (e.g. delete objects older than 90 days) directly in the bucket's
  settings — this is bucket configuration, not app code.
