import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { requireAdminEmail } from "@/lib/firebase/admin-auth";
import { withRouteErrorHandling } from "@/lib/api/errors";

export const runtime = "nodejs";

export const GET = withRouteErrorHandling("GET /api/admin/inquiries", async (req: NextRequest) => {
  const admin = await requireAdminEmail(req, "inquiries");
  if (admin instanceof NextResponse) return admin;

  const snapshot = await getAdminDb().collection("inquiries").orderBy("createdAt", "desc").get();
  const inquiries = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

  return NextResponse.json({ inquiries });
});
