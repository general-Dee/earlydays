import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { withAdminRoute } from "@/lib/firebase/admin-auth";

export const runtime = "nodejs";

export const GET = withAdminRoute("applications", "GET /api/admin/applications", async (req: NextRequest, admin) => {
  const snapshot = await getAdminDb().collection("applications").orderBy("createdAt", "desc").get();
  const applications = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

  return NextResponse.json({ applications });
});
