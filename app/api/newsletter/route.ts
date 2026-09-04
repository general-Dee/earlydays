import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { withRouteErrorHandling } from "@/lib/api/errors";
import { COLLECTIONS } from "@/lib/firebase/collections";

export const runtime = "nodejs";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_NAME_LENGTH = 100;

export const POST = withRouteErrorHandling("POST /api/newsletter", async (req: NextRequest) => {
  const ip = getClientIp(req);
  if (!(await checkRateLimit(`newsletter:${ip}`, { max: 5, windowMs: 10 * 60 * 1000 }))) {
    return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 });
  }

  const { email, name, hp } = (await req.json()) as { email?: string; name?: string; hp?: string };

  // Honeypot: real visitors never fill this hidden field.
  if (hp) {
    return NextResponse.json({ ok: true });
  }

  const trimmedEmail = email?.trim().toLowerCase() ?? "";
  const trimmedName = name?.trim().slice(0, MAX_NAME_LENGTH) ?? "";

  if (!trimmedEmail || !EMAIL_PATTERN.test(trimmedEmail)) {
    return NextResponse.json({ error: "Enter a valid email address" }, { status: 400 });
  }

  await getAdminDb()
    .collection(COLLECTIONS.subscribers)
    .doc(trimmedEmail)
    .set(
      {
        email: trimmedEmail,
        ...(trimmedName ? { name: trimmedName } : {}),
        createdAt: Date.now(),
      },
      { merge: true }
    );

  return NextResponse.json({ ok: true });
});
