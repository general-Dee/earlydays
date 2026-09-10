import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { withAdminRoute } from "@/lib/firebase/admin-auth";
import { COLLECTIONS } from "@/lib/firebase/collections";
import { validateRequiredString } from "@/lib/validation";
import { logAdminAction } from "@/lib/audit";
import type { CalendarEvent } from "@/lib/firebase/types";

export const runtime = "nodejs";

const MAX_TITLE_LENGTH = 200;
const MAX_TAG_LENGTH = 60;
const MAX_DESC_LENGTH = 500;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export const PATCH = withAdminRoute<{ params: { id: string } }>(
  "events",
  "PATCH /api/admin/events/[id]",
  async (req: NextRequest, admin, { params }) => {
    const docRef = getAdminDb().collection(COLLECTIONS.events).doc(params.id);
    const snap = await docRef.get();
    if (!snap.exists) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }
    const existing = snap.data() as CalendarEvent;

    const { title, date, tag, desc } = (await req.json()) as {
      title?: string;
      date?: string;
      tag?: string;
      desc?: string;
    };

    const patch: Record<string, unknown> = { updatedAt: Date.now() };

    if (typeof title === "string") {
      const result = validateRequiredString(title, { label: "Title", maxLength: MAX_TITLE_LENGTH });
      if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
      patch.title = result.value;
    }

    if (typeof date === "string") {
      const result = validateRequiredString(date, {
        label: "Date",
        maxLength: 20,
        pattern: { regex: DATE_PATTERN, message: "Date must be in YYYY-MM-DD format" },
      });
      if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
      patch.date = result.value;
    }

    if (typeof tag === "string") {
      const result = validateRequiredString(tag, { label: "Tag", maxLength: MAX_TAG_LENGTH });
      if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
      patch.tag = result.value;
    }

    if (typeof desc === "string") {
      const result = validateRequiredString(desc, { label: "Description", maxLength: MAX_DESC_LENGTH });
      if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
      patch.desc = result.value;
    }

    await docRef.update(patch);

    await logAdminAction({
      action: "event.updated",
      actorEmail: admin.email,
      detail: `${(patch.title as string | undefined) ?? existing.title} (${(patch.date as string | undefined) ?? existing.date})`,
    });

    return NextResponse.json({ ...existing, ...patch, id: params.id });
  }
);

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
