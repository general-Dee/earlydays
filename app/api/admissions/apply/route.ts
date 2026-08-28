import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { getAdminDb } from "@/lib/firebase/admin";
import { sendApplicationConfirmationEmail, sendApplicationNotification } from "@/lib/email/notify";
import { stages } from "@/lib/data";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { logRouteError, withRouteErrorHandling } from "@/lib/api/errors";
import { COLLECTIONS } from "@/lib/firebase/collections";

export const runtime = "nodejs";

const MAX_NOTES_LENGTH = 2000;
const VALID_STAGE_CODES = stages.map((s) => s.code);

export const POST = withRouteErrorHandling("POST /api/admissions/apply", async (req: NextRequest) => {
  const ip = getClientIp(req);
  if (!checkRateLimit(`admissions:${ip}`, { max: 3, windowMs: 10 * 60 * 1000 })) {
    return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 });
  }

  const { childName, childDob, desiredStage, guardianName, email, phone, notes, hp } = (await req.json()) as {
    childName?: string;
    childDob?: string;
    desiredStage?: string;
    guardianName?: string;
    email?: string;
    phone?: string;
    notes?: string;
    hp?: string;
  };

  // Honeypot: real visitors never fill this hidden field.
  if (hp) {
    return NextResponse.json({ ok: true });
  }

  const trimmedChildName = childName?.trim() ?? "";
  const trimmedChildDob = childDob?.trim() ?? "";
  const trimmedDesiredStage = desiredStage?.trim() ?? "";
  const trimmedGuardianName = guardianName?.trim() ?? "";
  const trimmedEmail = email?.trim() ?? "";
  const trimmedPhone = phone?.trim() ?? "";
  const trimmedNotes = notes?.trim() ?? "";

  if (!trimmedChildName || !trimmedChildDob || !trimmedGuardianName) {
    return NextResponse.json(
      { error: "Child's name, date of birth, and guardian name are required" },
      { status: 400 }
    );
  }
  if (!VALID_STAGE_CODES.includes(trimmedDesiredStage)) {
    return NextResponse.json({ error: "Please select a valid stage" }, { status: 400 });
  }
  if (!trimmedEmail && !trimmedPhone) {
    return NextResponse.json({ error: "Provide an email or phone number so we can reply" }, { status: 400 });
  }
  if (trimmedNotes.length > MAX_NOTES_LENGTH) {
    return NextResponse.json({ error: "Notes are too long" }, { status: 400 });
  }

  const referenceCode = randomUUID().replace(/-/g, "").slice(0, 8).toUpperCase();

  await getAdminDb()
    .collection(COLLECTIONS.applications)
    .add({
      childName: trimmedChildName,
      childDob: trimmedChildDob,
      desiredStage: trimmedDesiredStage,
      guardianName: trimmedGuardianName,
      email: trimmedEmail || null,
      phone: trimmedPhone || null,
      notes: trimmedNotes,
      status: "new",
      referenceCode,
      createdAt: Date.now(),
    });

  try {
    await sendApplicationNotification({
      childName: trimmedChildName,
      childDob: trimmedChildDob,
      desiredStage: trimmedDesiredStage,
      guardianName: trimmedGuardianName,
      email: trimmedEmail || null,
      phone: trimmedPhone || null,
      notes: trimmedNotes,
    });
  } catch (err) {
    logRouteError("POST /api/admissions/apply", "failed to send application notification email", err);
  }

  if (trimmedEmail) {
    try {
      await sendApplicationConfirmationEmail(
        { guardianName: trimmedGuardianName, email: trimmedEmail, childName: trimmedChildName },
        referenceCode
      );
    } catch (err) {
      logRouteError("POST /api/admissions/apply", "failed to send application confirmation email", err);
    }
  }

  return NextResponse.json({ ok: true, referenceCode });
});
