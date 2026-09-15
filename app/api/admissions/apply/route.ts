import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { sendApplicationConfirmationEmail, sendApplicationNotification } from "@/lib/email/notify";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { logRouteError, withRouteErrorHandling } from "@/lib/api/errors";
import { COLLECTIONS } from "@/lib/firebase/collections";
import { generateReferenceCode } from "@/lib/referenceCode";
import { admissionsApplySchema } from "./validation";

export const runtime = "nodejs";

export const POST = withRouteErrorHandling("POST /api/admissions/apply", async (req: NextRequest) => {
  const ip = getClientIp(req);
  if (!(await checkRateLimit(`admissions:${ip}`, { max: 3, windowMs: 10 * 60 * 1000 }))) {
    return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 });
  }

  const body = (await req.json()) as { hp?: string } & Record<string, unknown>;

  // Honeypot: real visitors never fill this hidden field.
  if (body.hp) {
    return NextResponse.json({ ok: true });
  }

  const parsed = admissionsApplySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }
  const { childName, childDob, desiredStage, guardianName, email, phone, notes } = parsed.data;

  const referenceCode = generateReferenceCode();

  await getAdminDb()
    .collection(COLLECTIONS.applications)
    .add({
      childName,
      childDob,
      desiredStage,
      guardianName,
      email: email || null,
      phone: phone || null,
      notes,
      status: "new",
      referenceCode,
      createdAt: Date.now(),
    });

  try {
    await sendApplicationNotification({
      childName,
      childDob,
      desiredStage,
      guardianName,
      email: email || null,
      phone: phone || null,
      notes,
    });
  } catch (err) {
    logRouteError("POST /api/admissions/apply", "failed to send application notification email", err);
  }

  if (email) {
    try {
      await sendApplicationConfirmationEmail({ guardianName, email, childName }, referenceCode);
    } catch (err) {
      logRouteError("POST /api/admissions/apply", "failed to send application confirmation email", err);
    }
  }

  return NextResponse.json({ ok: true, referenceCode });
});
