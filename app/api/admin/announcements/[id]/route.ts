import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { withAdminRoute } from "@/lib/firebase/admin-auth";
import { COLLECTIONS } from "@/lib/firebase/collections";
import { validateRequiredString } from "@/lib/validation";
import { logAdminAction } from "@/lib/audit";
import type { Announcement } from "@/lib/firebase/types";

export const runtime = "nodejs";

const MAX_TITLE_LENGTH = 200;
const MAX_BODY_LENGTH = 2000;

export const PATCH = withAdminRoute<{ params: { id: string } }>(
  "announcements",
  "PATCH /api/admin/announcements/[id]",
  async (req: NextRequest, admin, { params }) => {
    const docRef = getAdminDb().collection(COLLECTIONS.announcements).doc(params.id);
    const snap = await docRef.get();
    if (!snap.exists) {
      return NextResponse.json({ error: "Announcement not found" }, { status: 404 });
    }
    const existing = snap.data() as Announcement;

    const { title, body } = (await req.json()) as { title?: string; body?: string };

    const patch: Record<string, unknown> = { updatedAt: Date.now() };

    if (typeof title === "string") {
      const result = validateRequiredString(title, { label: "Title", maxLength: MAX_TITLE_LENGTH });
      if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
      patch.title = result.value;
    }

    if (typeof body === "string") {
      const result = validateRequiredString(body, { label: "Body", maxLength: MAX_BODY_LENGTH });
      if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
      patch.body = result.value;
    }

    await docRef.update(patch);

    await logAdminAction({
      action: "announcement.updated",
      actorEmail: admin.email,
      detail: (patch.title as string | undefined) ?? existing.title,
    });

    return NextResponse.json({ ...existing, ...patch, id: params.id });
  }
);

export const DELETE = withAdminRoute<{ params: { id: string } }>(
  "announcements",
  "DELETE /api/admin/announcements/[id]",
  async (req: NextRequest, admin, { params }) => {
    const docRef = getAdminDb().collection(COLLECTIONS.announcements).doc(params.id);

    // Read the title before deleting so the audit entry names the announcement
    // rather than just its opaque id. A missing doc still deletes as a no-op,
    // same as before.
    const snapshot = await docRef.get();
    const title = snapshot.exists ? (snapshot.data()?.title as string | undefined) : undefined;

    await docRef.delete();

    await logAdminAction({
      action: "announcement.deleted",
      actorEmail: admin.email,
      ...(title ? { detail: title } : {}),
    });

    return NextResponse.json({ ok: true });
  }
);
