import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { withAdminRoute } from "@/lib/firebase/admin-auth";
import { COLLECTIONS } from "@/lib/firebase/collections";
import type { Subscriber } from "@/lib/firebase/types";

export const runtime = "nodejs";

export const GET = withAdminRoute("subscribers", "GET /api/admin/subscribers", async (req: NextRequest, admin) => {
  const snapshot = await getAdminDb().collection(COLLECTIONS.subscribers).orderBy("createdAt", "desc").get();
  const subscribers = snapshot.docs.map((doc) => doc.data() as Subscriber);
  return NextResponse.json({ subscribers });
});
