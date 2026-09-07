import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { withSuperAdminRoute } from "@/lib/firebase/admin-auth";
import { COLLECTIONS } from "@/lib/firebase/collections";
import type { AuditLogEntry } from "@/lib/firebase/types";

export const runtime = "nodejs";

// Every mutating admin action writes an entry, so this collection grows without
// bound. Cap the read at the most recent slice rather than pulling the whole
// history back on each page load — the viewer paginates 20 at a time, so this
// is far more than it ever shows.
const MAX_ENTRIES = 500;

export const GET = withSuperAdminRoute("GET /api/admin/audit", async (req: NextRequest) => {
  const snapshot = await getAdminDb()
    .collection(COLLECTIONS.auditLog)
    .orderBy("createdAt", "desc")
    .limit(MAX_ENTRIES)
    .get();
  const entries = snapshot.docs.map((doc) => doc.data() as AuditLogEntry);

  return NextResponse.json({ entries });
});
