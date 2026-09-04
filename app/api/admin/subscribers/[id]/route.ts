import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { withAdminRoute } from "@/lib/firebase/admin-auth";
import { COLLECTIONS } from "@/lib/firebase/collections";

export const runtime = "nodejs";

// `id` is the subscriber's email address (used as the Firestore doc ID —
// see app/api/newsletter/route.ts), so it comes in URI-encoded.
export const DELETE = withAdminRoute<{ params: { id: string } }>(
  "subscribers",
  "DELETE /api/admin/subscribers/[id]",
  async (req: NextRequest, admin, { params }) => {
    await getAdminDb().collection(COLLECTIONS.subscribers).doc(decodeURIComponent(params.id)).delete();

    return NextResponse.json({ ok: true });
  }
);
