import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { withAdminRoute } from "@/lib/firebase/admin-auth";
import { COLLECTIONS } from "@/lib/firebase/collections";
import { logAdminAction } from "@/lib/audit";
import type { CalendarEvent } from "@/lib/firebase/types";

export const runtime = "nodejs";

export const DELETE = withAdminRoute<{ params: { id: string } }>(
  "events",
  "DELETE /api/admin/events/[id]",
  async (req: NextRequest, admin, { params }) => {
    const ref = getAdminDb().collection(COLLECTIONS.events).doc(params.id);

    // Read before deleting so the audit entry names the event rather than an
    // opaque doc id. A missing doc still deletes as a no-op, same as before.
    const snap = await ref.get();
    const event = snap.exists ? (snap.data() as CalendarEvent) : undefined;

    await ref.delete();

    await logAdminAction({
      action: "event.deleted",
      actorEmail: admin.email,
      ...(event ? { detail: `${event.title} (${event.date})` } : {}),
    });

    return NextResponse.json({ ok: true });
  }
);
