import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { withSuperAdminRoute } from "@/lib/firebase/admin-auth";
import { COLLECTIONS } from "@/lib/firebase/collections";
import { logAdminAction } from "@/lib/audit";
import { checkRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

// `key` is the bucket's Firestore doc ID (e.g. "admin-parents-write:staff@earlydays.example"),
// which can contain "@"/":" characters, so it comes in URI-encoded — same
// convention as app/api/admin/subscribers/[id]/route.ts.
export const DELETE = withSuperAdminRoute<{ params: { key: string } }>(
  "DELETE /api/admin/rate-limits/[key]",
  async (req: NextRequest, admin, { params }) => {
    if (!(await checkRateLimit(`admin-rate-limits-write:${admin.email}`, { max: 30, windowMs: 10 * 60 * 1000 }))) {
      return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 });
    }

    const key = decodeURIComponent(params.key);
    await getAdminDb().collection(COLLECTIONS.rateLimits).doc(key).delete();

    await logAdminAction({
      action: "rate_limit_bucket.deleted",
      actorEmail: admin.email,
      detail: key,
    });

    return NextResponse.json({ ok: true });
  }
);
