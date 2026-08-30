import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { withAdminRoute } from "@/lib/firebase/admin-auth";
import { COLLECTIONS } from "@/lib/firebase/collections";
import { validateRequiredString } from "@/lib/validation";

export const runtime = "nodejs";

const MAX_NAME_LENGTH = 200;
const MAX_MESSAGE_LENGTH = 2000;

export const GET = withAdminRoute("inquiries", "GET /api/admin/inquiries", async (req: NextRequest, admin) => {
  const snapshot = await getAdminDb().collection(COLLECTIONS.inquiries).orderBy("createdAt", "desc").get();
  const inquiries = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

  return NextResponse.json({ inquiries });
});

export const POST = withAdminRoute("inquiries", "POST /api/admin/inquiries", async (req: NextRequest, admin) => {
  const { name, email, phone, message } = (await req.json()) as {
    name?: string;
    email?: string;
    phone?: string;
    message?: string;
  };

  const nameResult = validateRequiredString(name, { label: "Name", maxLength: MAX_NAME_LENGTH });
  if (!nameResult.ok) return NextResponse.json({ error: nameResult.error }, { status: 400 });

  const messageResult = validateRequiredString(message, { label: "Message", maxLength: MAX_MESSAGE_LENGTH });
  if (!messageResult.ok) return NextResponse.json({ error: messageResult.error }, { status: 400 });

  const trimmedEmail = email?.trim() ?? "";
  const trimmedPhone = phone?.trim() ?? "";
  if (!trimmedEmail && !trimmedPhone) {
    return NextResponse.json({ error: "Provide an email or phone number" }, { status: 400 });
  }

  const inquiry = {
    name: nameResult.value,
    email: trimmedEmail || null,
    phone: trimmedPhone || null,
    message: messageResult.value,
    status: "new" as const,
    createdAt: Date.now(),
  };

  const ref = await getAdminDb().collection(COLLECTIONS.inquiries).add(inquiry);

  return NextResponse.json({ id: ref.id, ...inquiry });
});
