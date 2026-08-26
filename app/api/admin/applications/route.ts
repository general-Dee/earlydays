import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { withAdminRoute } from "@/lib/firebase/admin-auth";
import { COLLECTIONS } from "@/lib/firebase/collections";

export const runtime = "nodejs";

export const GET = withAdminRoute("applications", "GET /api/admin/applications", async (req: NextRequest, admin) => {
  const snapshot = await getAdminDb().collection(COLLECTIONS.applications).orderBy("createdAt", "desc").get();
  const applications = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

  return NextResponse.json({ applications });
});
