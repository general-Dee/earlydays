import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { withAdminRoute } from "@/lib/firebase/admin-auth";
import { COLLECTIONS } from "@/lib/firebase/collections";
import { validateRequiredString } from "@/lib/validation";
import { logAdminAction } from "@/lib/audit";
import type { Testimonial } from "@/lib/firebase/types";

export const runtime = "nodejs";

export const PATCH = withAdminRoute<{ params: { id: string } }>(
  "testimonials",
  "PATCH /api/admin/testimonials/[id]",
  async (req: NextRequest, admin, { params }) => {
    const testimonialRef = getAdminDb().collection(COLLECTIONS.testimonials).doc(params.id);
    const snap = await testimonialRef.get();
    if (!snap.exists) {
      return NextResponse.json({ error: "Testimonial not found" }, { status: 404 });
    }
    const existing = snap.data() as Testimonial;

    const { quote, name, area, initial, order } = (await req.json()) as {
      quote?: string;
      name?: string;
      area?: string;
      initial?: string;
      order?: number;
    };

    const patch: Record<string, unknown> = { updatedAt: Date.now() };

    if (typeof quote === "string") {
      const result = validateRequiredString(quote, { label: "Quote", maxLength: 500 });
      if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
      patch.quote = result.value;
    }

    if (typeof name === "string") {
      const result = validateRequiredString(name, { label: "Name", maxLength: 100 });
      if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
      patch.name = result.value;
    }

    if (typeof area === "string") {
      const result = validateRequiredString(area, { label: "Area", maxLength: 100 });
      if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
      patch.area = result.value;
    }

    if (typeof initial === "string") {
      const result = validateRequiredString(initial, { label: "Initial", maxLength: 2 });
      if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
      patch.initial = result.value;
    }

    if (typeof order === "number") {
      if (!Number.isFinite(order) || !Number.isInteger(order)) {
        return NextResponse.json({ error: "Order must be a whole number" }, { status: 400 });
      }
      patch.order = order;
    }

    await testimonialRef.update(patch);

    await logAdminAction({
      action: "testimonial.updated",
      actorEmail: admin.email,
      detail: (patch.name as string | undefined) ?? existing.name,
    });

    return NextResponse.json({ ...existing, ...patch, id: params.id });
  }
);

export const DELETE = withAdminRoute<{ params: { id: string } }>(
  "testimonials",
  "DELETE /api/admin/testimonials/[id]",
  async (req: NextRequest, admin, { params }) => {
    const testimonialRef = getAdminDb().collection(COLLECTIONS.testimonials).doc(params.id);

    // Read before deleting so the audit entry names the testimonial's author
    // rather than an opaque doc id. A missing doc still deletes as a no-op.
    const snap = await testimonialRef.get();

    await testimonialRef.delete();

    await logAdminAction({
      action: "testimonial.deleted",
      actorEmail: admin.email,
      ...(snap.exists ? { detail: (snap.data() as Testimonial).name } : {}),
    });

    return NextResponse.json({ ok: true });
  }
);
