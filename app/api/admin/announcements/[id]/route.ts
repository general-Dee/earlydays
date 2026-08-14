import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { requireAdminEmail } from "@/lib/firebase/admin-auth";

export const runtime = "nodejs";

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const admin = await requireAdminEmail(req);
  if (admin instanceof NextResponse) return admin;

  await getAdminDb().collection("announcements").doc(params.id).delete();

  return NextResponse.json({ ok: true });
}
