import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { sendContactNotification } from "@/lib/email/notify";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { logRouteError, withRouteErrorHandling } from "@/lib/api/errors";
import { COLLECTIONS } from "@/lib/firebase/collections";
import { contactSchema } from "./validation";

export const runtime = "nodejs";

export const POST = withRouteErrorHandling("POST /api/contact", async (req: NextRequest) => {
  const ip = getClientIp(req);
  if (!(await checkRateLimit(`contact:${ip}`, { max: 5, windowMs: 10 * 60 * 1000 }))) {
    return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 });
  }

  const body = (await req.json()) as { hp?: string } & Record<string, unknown>;

  // Honeypot: real visitors never fill this hidden field.
  if (body.hp) {
    return NextResponse.json({ ok: true });
  }

  const parsed = contactSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }
  const { name, email, phone, message } = parsed.data;

  await getAdminDb()
    .collection(COLLECTIONS.inquiries)
    .add({
      name,
      email: email || null,
      phone: phone || null,
      message,
      status: "new",
      createdAt: Date.now(),
    });

  try {
    await sendContactNotification({
      name,
      email: email || null,
      phone: phone || null,
      message,
    });
  } catch (err) {
    logRouteError("POST /api/contact", "failed to send contact notification email", err);
  }

  return NextResponse.json({ ok: true });
});
