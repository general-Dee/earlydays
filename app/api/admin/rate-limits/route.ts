import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { withSuperAdminRoute } from "@/lib/firebase/admin-auth";
import { COLLECTIONS } from "@/lib/firebase/collections";

export const runtime = "nodejs";

// Buckets never expire on their own (see lib/rate-limit.ts), so this
// collection can grow without bound. Cap the read and surface the most
// recently active buckets first, same shape as /api/admin/audit.
const MAX_BUCKETS = 500;

type RateLimitBucket = { key: string; count: number; resetAt: number };

export const GET = withSuperAdminRoute("GET /api/admin/rate-limits", async (req: NextRequest) => {
  const snapshot = await getAdminDb()
    .collection(COLLECTIONS.rateLimits)
    .orderBy("resetAt", "desc")
    .limit(MAX_BUCKETS)
    .get();
  const buckets: RateLimitBucket[] = snapshot.docs.map((doc) => {
    const data = doc.data() as { count: number; resetAt: number };
    return { key: doc.id, count: data.count, resetAt: data.resetAt };
  });

  return NextResponse.json({ buckets });
});
