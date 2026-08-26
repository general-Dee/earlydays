import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { withAdminRoute } from "@/lib/firebase/admin-auth";

export const runtime = "nodejs";

export const DELETE = withAdminRoute<{ params: { id: string } }>(
  "announcements",
  "DELETE /api/admin/announcements/[id]",
  async (req: NextRequest, admin, { params }) => {
    await getAdminDb().collection("announcements").doc(params.id).delete();

    return NextResponse.json({ ok: true });
  }
);
