import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { requireAdminEmail } from "@/lib/firebase/admin-auth";
import { withRouteErrorHandling } from "@/lib/api/errors";

export const runtime = "nodejs";

export const DELETE = withRouteErrorHandling<{ params: { id: string } }>(
  "DELETE /api/admin/events/[id]",
  async (req: NextRequest, { params }) => {
    const admin = await requireAdminEmail(req, "events");
    if (admin instanceof NextResponse) return admin;

    await getAdminDb().collection("events").doc(params.id).delete();

    return NextResponse.json({ ok: true });
  }
);
