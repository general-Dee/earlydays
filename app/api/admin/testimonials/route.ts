import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { withAdminRoute } from "@/lib/firebase/admin-auth";
import { COLLECTIONS } from "@/lib/firebase/collections";
import { validateRequiredString } from "@/lib/validation";
import type { Testimonial } from "@/lib/firebase/types";

export const runtime = "nodejs";

export const GET = withAdminRoute("testimonials", "GET /api/admin/testimonials", async (req: NextRequest, admin) => {
  const snapshot = await getAdminDb().collection(COLLECTIONS.testimonials).orderBy("order", "asc").get();
  const testimonials = snapshot.docs.map((doc) => doc.data() as Testimonial);
  return NextResponse.json({ testimonials });
});

export const POST = withAdminRoute("testimonials", "POST /api/admin/testimonials", async (req: NextRequest, admin) => {
  const { quote, name, area, initial, order } = (await req.json()) as {
    quote?: string;
    name?: string;
    area?: string;
    initial?: string;
    order?: number;
  };

  const quoteResult = validateRequiredString(quote, { label: "Quote", maxLength: 500 });
  if (!quoteResult.ok) return NextResponse.json({ error: quoteResult.error }, { status: 400 });

  const nameResult = validateRequiredString(name, { label: "Name", maxLength: 100 });
  if (!nameResult.ok) return NextResponse.json({ error: nameResult.error }, { status: 400 });

  const areaResult = validateRequiredString(area, { label: "Area", maxLength: 100 });
  if (!areaResult.ok) return NextResponse.json({ error: areaResult.error }, { status: 400 });

  const initialResult = validateRequiredString(initial, { label: "Initial", maxLength: 2 });
  if (!initialResult.ok) return NextResponse.json({ error: initialResult.error }, { status: 400 });

  if (typeof order !== "number" || !Number.isFinite(order) || !Number.isInteger(order)) {
    return NextResponse.json({ error: "Order must be a whole number" }, { status: 400 });
  }

  const testimonialRef = getAdminDb().collection(COLLECTIONS.testimonials).doc();
  const testimonial: Testimonial = {
    id: testimonialRef.id,
    quote: quoteResult.value,
    name: nameResult.value,
    area: areaResult.value,
    initial: initialResult.value,
    order,
    createdBy: admin.email,
    createdAt: Date.now(),
  };

  await testimonialRef.set(testimonial);

  return NextResponse.json(testimonial);
});
