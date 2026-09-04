import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { withAdminRoute } from "@/lib/firebase/admin-auth";
import { paths } from "@/lib/firebase/collections";
import type { EventRsvp } from "@/lib/firebase/types";

export const runtime = "nodejs";

export const GET = withAdminRoute<{ params: { id: string } }>(
  "events",
  "GET /api/admin/events/[id]/rsvps",
  async (req: NextRequest, admin, { params }) => {
    const snapshot = await getAdminDb().collection(paths.eventRsvps(params.id)).orderBy("createdAt", "asc").get();
    const rsvps = snapshot.docs.map((doc) => doc.data() as EventRsvp);
    return NextResponse.json({ rsvps });
  }
);
