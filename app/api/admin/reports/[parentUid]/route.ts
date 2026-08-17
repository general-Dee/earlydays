import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { requireAdminEmail } from "@/lib/firebase/admin-auth";

export const runtime = "nodejs";

export async function GET(req: NextRequest, { params }: { params: { parentUid: string } }) {
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
