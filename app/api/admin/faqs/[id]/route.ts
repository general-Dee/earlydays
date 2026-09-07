import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { withAdminRoute } from "@/lib/firebase/admin-auth";
import { COLLECTIONS } from "@/lib/firebase/collections";
import { validateRequiredString } from "@/lib/validation";
import { logAdminAction } from "@/lib/audit";
import type { Faq } from "@/lib/firebase/types";

export const runtime = "nodejs";

export const PATCH = withAdminRoute<{ params: { id: string } }>(
  "faqs",
  "PATCH /api/admin/faqs/[id]",
  async (req: NextRequest, admin, { params }) => {
    const faqRef = getAdminDb().collection(COLLECTIONS.faqs).doc(params.id);
    const snap = await faqRef.get();
    if (!snap.exists) {
      return NextResponse.json({ error: "FAQ not found" }, { status: 404 });
    }
    const existing = snap.data() as Faq;

    const { question, answer, order } = (await req.json()) as {
      question?: string;
      answer?: string;
      order?: number;
    };

    const patch: Record<string, unknown> = { updatedAt: Date.now() };

    if (typeof question === "string") {
      const result = validateRequiredString(question, { label: "Question", maxLength: 200 });
      if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
      patch.question = result.value;
    }

    if (typeof answer === "string") {
      const result = validateRequiredString(answer, { label: "Answer", maxLength: 2000 });
      if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
      patch.answer = result.value;
    }

    if (typeof order === "number") {
      if (!Number.isFinite(order) || !Number.isInteger(order)) {
        return NextResponse.json({ error: "Order must be a whole number" }, { status: 400 });
      }
      patch.order = order;
    }

    await faqRef.update(patch);

    await logAdminAction({
      action: "faq.updated",
      actorEmail: admin.email,
      detail: (patch.question as string | undefined) ?? existing.question,
    });

    return NextResponse.json({ ...existing, ...patch, id: params.id });
  }
);

export const DELETE = withAdminRoute<{ params: { id: string } }>(
  "faqs",
  "DELETE /api/admin/faqs/[id]",
  async (req: NextRequest, admin, { params }) => {
    const faqRef = getAdminDb().collection(COLLECTIONS.faqs).doc(params.id);

    // Read before deleting so the audit entry names the FAQ rather than an
    // opaque doc id. A missing doc still deletes as a no-op, same as before.
    const snap = await faqRef.get();

    await faqRef.delete();

    await logAdminAction({
      action: "faq.deleted",
      actorEmail: admin.email,
      ...(snap.exists ? { detail: (snap.data() as Faq).question } : {}),
    });

    return NextResponse.json({ ok: true });
  }
);
