import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { withAdminRoute } from "@/lib/firebase/admin-auth";
import { COLLECTIONS } from "@/lib/firebase/collections";
import { validateRequiredString } from "@/lib/validation";
import type { Faq } from "@/lib/firebase/types";

export const runtime = "nodejs";

export const GET = withAdminRoute("faqs", "GET /api/admin/faqs", async (req: NextRequest, admin) => {
  const snapshot = await getAdminDb().collection(COLLECTIONS.faqs).orderBy("order", "asc").get();
  const faqs = snapshot.docs.map((doc) => doc.data() as Faq);
  return NextResponse.json({ faqs });
});

export const POST = withAdminRoute("faqs", "POST /api/admin/faqs", async (req: NextRequest, admin) => {
  const { question, answer, order } = (await req.json()) as {
    question?: string;
    answer?: string;
    order?: number;
  };

  const questionResult = validateRequiredString(question, { label: "Question", maxLength: 200 });
  if (!questionResult.ok) return NextResponse.json({ error: questionResult.error }, { status: 400 });

  const answerResult = validateRequiredString(answer, { label: "Answer", maxLength: 2000 });
  if (!answerResult.ok) return NextResponse.json({ error: answerResult.error }, { status: 400 });

  if (typeof order !== "number" || !Number.isFinite(order) || !Number.isInteger(order)) {
    return NextResponse.json({ error: "Order must be a whole number" }, { status: 400 });
  }

  const faqRef = getAdminDb().collection(COLLECTIONS.faqs).doc();
  const faq: Faq = {
    id: faqRef.id,
    question: questionResult.value,
    answer: answerResult.value,
    order,
    createdBy: admin.email,
    createdAt: Date.now(),
  };

  await faqRef.set(faq);

  return NextResponse.json(faq);
});
