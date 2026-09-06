import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { withSuperAdminRoute } from "@/lib/firebase/admin-auth";
import { COLLECTIONS } from "@/lib/firebase/collections";
import type { AuditLogEntry } from "@/lib/firebase/types";

export const runtime = "nodejs";

export const GET = withSuperAdminRoute("GET /api/admin/audit", async (req: NextRequest) => {
  const snapshot = await getAdminDb().collection(COLLECTIONS.auditLog).orderBy("createdAt", "desc").get();
  const entries = snapshot.docs.map((doc) => doc.data() as AuditLogEntry);

  return NextResponse.json({ entries });
});
