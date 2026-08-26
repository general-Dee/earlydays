import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { withAdminRoute } from "@/lib/firebase/admin-auth";

export const runtime = "nodejs";

export const DELETE = withAdminRoute<{ params: { id: string } }>(
  "events",
  "DELETE /api/admin/events/[id]",
  async (req: NextRequest, admin, { params }) => {
    await getAdminDb().collection("events").doc(params.id).delete();

    return NextResponse.json({ ok: true });
  }
);
