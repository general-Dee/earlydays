import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { withSuperAdminRoute } from "@/lib/firebase/admin-auth";
import { COLLECTIONS } from "@/lib/firebase/collections";
import type { CronRunRecord } from "@/lib/firebase/types";

export const runtime = "nodejs";

// Every cron run writes an entry, so this collection grows without bound.
// Cap the read at the most recent slice, same shape as /api/admin/audit.
const MAX_RUNS = 500;

export const GET = withSuperAdminRoute("GET /api/admin/cron-runs", async (req: NextRequest) => {
  const snapshot = await getAdminDb()
    .collection(COLLECTIONS.cronRuns)
    .orderBy("createdAt", "desc")
    .limit(MAX_RUNS)
    .get();
  const runs = snapshot.docs.map((doc) => doc.data() as CronRunRecord);

  return NextResponse.json({ runs });
});
