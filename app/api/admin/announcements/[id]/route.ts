import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { withAdminRoute } from "@/lib/firebase/admin-auth";
import { COLLECTIONS } from "@/lib/firebase/collections";
import { logAdminAction } from "@/lib/audit";

export const runtime = "nodejs";

export const DELETE = withAdminRoute<{ params: { id: string } }>(
  "announcements",
  "DELETE /api/admin/announcements/[id]",
  async (req: NextRequest, admin, { params }) => {
    const docRef = getAdminDb().collection(COLLECTIONS.announcements).doc(params.id);

    // Read the title before deleting so the audit entry names the announcement
    // rather than just its opaque id. A missing doc still deletes as a no-op,
    // same as before.
    const snapshot = await docRef.get();
    const title = snapshot.exists ? (snapshot.data()?.title as string | undefined) : undefined;

    await docRef.delete();

    await logAdminAction({
      action: "announcement.deleted",
      actorEmail: admin.email,
      ...(title ? { detail: title } : {}),
    });

    return NextResponse.json({ ok: true });
  }
);
