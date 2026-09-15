import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { getAdminAccessToken } from "@/lib/firebase/admin";
import { recordCronRun } from "@/lib/cronRuns";
import { logRouteError, withRouteErrorHandling } from "@/lib/api/errors";

export const runtime = "nodejs";

// Kicks off a Firestore managed export to the existing Storage bucket via the
// Firestore Admin REST API (projects.databases.exportDocuments) — no new
// infra, reuses the same service account and bucket already configured for
// Storage. This only *starts* the export; it's a long-running operation on
// Google's side, not something worth polling for completion from inside a
// single Vercel function invocation. See docs/firestore-backups.md for the
// one-time IAM grant this requires, and the restore procedure.
export const GET = withRouteErrorHandling("GET /api/cron/firestore-backup", async (req: NextRequest) => {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.get("authorization") ?? "";
  const expected = `Bearer ${cronSecret}`;
  const authorized =
    !!cronSecret && authHeader.length === expected.length && timingSafeEqual(Buffer.from(authHeader), Buffer.from(expected));

  if (!authorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
  const bucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
  if (!projectId || !bucket) {
    return NextResponse.json({ error: "Firebase project/bucket aren't configured" }, { status: 500 });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const outputUriPrefix = `gs://${bucket}/firestore-backups/${timestamp}`;

  let failures = 0;
  try {
    const accessToken = await getAdminAccessToken();
    const res = await fetch(
      `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default):exportDocuments`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ outputUriPrefix }),
      }
    );

    if (!res.ok) {
      failures = 1;
      const body = await res.text();
      logRouteError("GET /api/cron/firestore-backup", `export request failed with status ${res.status}`, new Error(body));
    }
  } catch (err) {
    failures = 1;
    logRouteError("GET /api/cron/firestore-backup", "failed to request Firestore export", err);
  } finally {
    await recordCronRun({
      job: "firestore-backup",
      counts: { exportRequested: failures === 0 ? 1 : 0 },
      failures,
    });
  }

  return NextResponse.json({ ok: failures === 0, outputUriPrefix });
});
