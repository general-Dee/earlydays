import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { withSuperAdminRoute } from "@/lib/firebase/admin-auth";
import { COLLECTIONS } from "@/lib/firebase/collections";
import type { NotificationFailure } from "@/lib/firebase/types";

export const runtime = "nodejs";

// Every failed send writes an entry, so this collection grows without
// bound. Cap the read at the most recent slice, same shape as /api/admin/cron-runs.
const MAX_FAILURES = 500;

export const GET = withSuperAdminRoute("GET /api/admin/notification-failures", async (req: NextRequest) => {
  const snapshot = await getAdminDb()
    .collection(COLLECTIONS.notificationFailures)
    .orderBy("createdAt", "desc")
    .limit(MAX_FAILURES)
    .get();
  const failures = snapshot.docs.map((doc) => doc.data() as NotificationFailure);

  return NextResponse.json({ failures });
});
