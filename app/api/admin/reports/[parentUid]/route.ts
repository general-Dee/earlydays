import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { requireAdminEmail } from "@/lib/firebase/admin-auth";
import { withRouteErrorHandling } from "@/lib/api/errors";

export const runtime = "nodejs";

export const GET = withRouteErrorHandling<{ params: { parentUid: string } }>(
  "GET /api/admin/reports/[parentUid]",
  async (req: NextRequest, { params }) => {
    const admin = await requireAdminEmail(req, "reports");
    if (admin instanceof NextResponse) return admin;

    const snapshot = await getAdminDb()
      .collection("parents")
      .doc(params.parentUid)
      .collection("reports")
      .orderBy("createdAt", "desc")
      .get();

    const reports = snapshot.docs.map((doc) => doc.data());

    return NextResponse.json({ reports });
  }
);
