import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { withAdminRoute } from "@/lib/firebase/admin-auth";

export const runtime = "nodejs";

export const GET = withAdminRoute<{ params: { parentUid: string } }>(
  "reports",
  "GET /api/admin/reports/[parentUid]",
  async (req: NextRequest, admin, { params }) => {
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
