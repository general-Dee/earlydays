import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { requireAdminEmail } from "@/lib/firebase/admin-auth";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const admin = await requireAdminEmail(req, "applications");
  if (admin instanceof NextResponse) return admin;

  const snapshot = await getAdminDb().collection("applications").orderBy("createdAt", "desc").get();
  const applications = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

  return NextResponse.json({ applications });
}
