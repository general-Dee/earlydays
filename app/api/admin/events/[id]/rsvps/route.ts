import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { withAdminRoute } from "@/lib/firebase/admin-auth";
import { COLLECTIONS, paths } from "@/lib/firebase/collections";
import type { EventRsvp } from "@/lib/firebase/types";

export const runtime = "nodejs";

export const GET = withAdminRoute<{ params: { id: string } }>(
  "events",
  "GET /api/admin/events/[id]/rsvps",
  async (req: NextRequest, admin, { params }) => {
    const eventSnap = await getAdminDb().collection(COLLECTIONS.events).doc(params.id).get();
    if (!eventSnap.exists) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    const snapshot = await getAdminDb().collection(paths.eventRsvps(params.id)).orderBy("createdAt", "asc").get();
    const rsvps = snapshot.docs.map((doc) => doc.data() as EventRsvp);
    return NextResponse.json({ rsvps });
  }
);
