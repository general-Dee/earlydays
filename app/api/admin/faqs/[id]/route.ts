import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { withAdminRoute } from "@/lib/firebase/admin-auth";
import { COLLECTIONS } from "@/lib/firebase/collections";
import { validateRequiredString } from "@/lib/validation";
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

    return NextResponse.json({ ...existing, ...patch, id: params.id });
  }
);

export const DELETE = withAdminRoute<{ params: { id: string } }>(
  "faqs",
  "DELETE /api/admin/faqs/[id]",
  async (req: NextRequest, admin, { params }) => {
    await getAdminDb().collection(COLLECTIONS.faqs).doc(params.id).delete();

    return NextResponse.json({ ok: true });
  }
);
