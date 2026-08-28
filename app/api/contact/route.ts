import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { sendContactNotification } from "@/lib/email/notify";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { logRouteError, withRouteErrorHandling } from "@/lib/api/errors";
import { COLLECTIONS } from "@/lib/firebase/collections";

export const runtime = "nodejs";

const MAX_MESSAGE_LENGTH = 2000;

export const POST = withRouteErrorHandling("POST /api/contact", async (req: NextRequest) => {
  const ip = getClientIp(req);
  if (!(await checkRateLimit(`contact:${ip}`, { max: 5, windowMs: 10 * 60 * 1000 }))) {
    return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 });
  }

  const { name, email, phone, message, hp } = (await req.json()) as {
    name?: string;
    email?: string;
    phone?: string;
    message?: string;
    hp?: string;
  };

  // Honeypot: real visitors never fill this hidden field.
  if (hp) {
    return NextResponse.json({ ok: true });
  }

  const trimmedName = name?.trim() ?? "";
  const trimmedEmail = email?.trim() ?? "";
  const trimmedPhone = phone?.trim() ?? "";
  const trimmedMessage = message?.trim() ?? "";

  if (!trimmedName || !trimmedMessage) {
    return NextResponse.json({ error: "Name and message are required" }, { status: 400 });
  }
  if (trimmedMessage.length > MAX_MESSAGE_LENGTH) {
    return NextResponse.json({ error: "Message is too long" }, { status: 400 });
  }
  if (!trimmedEmail && !trimmedPhone) {
    return NextResponse.json({ error: "Provide an email or phone number so we can reply" }, { status: 400 });
  }

  await getAdminDb()
    .collection(COLLECTIONS.inquiries)
    .add({
      name: trimmedName,
      email: trimmedEmail || null,
      phone: trimmedPhone || null,
      message: trimmedMessage,
      status: "new",
      createdAt: Date.now(),
    });

  try {
    await sendContactNotification({
      name: trimmedName,
      email: trimmedEmail || null,
      phone: trimmedPhone || null,
      message: trimmedMessage,
    });
  } catch (err) {
    logRouteError("POST /api/contact", "failed to send contact notification email", err);
  }

  return NextResponse.json({ ok: true });
});
