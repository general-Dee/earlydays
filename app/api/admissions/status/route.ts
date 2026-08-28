import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { withRouteErrorHandling } from "@/lib/api/errors";
import { validateRequiredString } from "@/lib/validation";
import { COLLECTIONS } from "@/lib/firebase/collections";
import type { Application } from "@/lib/firebase/types";

export const runtime = "nodejs";

const NOT_FOUND_MESSAGE = "No matching application found. Double-check your reference code.";

export const POST = withRouteErrorHandling("POST /api/admissions/status", async (req: NextRequest) => {
  const ip = getClientIp(req);
  if (!checkRateLimit(`app-status:${ip}`, { max: 10, windowMs: 10 * 60 * 1000 })) {
    return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 });
  }

  const { referenceCode } = (await req.json()) as { referenceCode?: string };

  const validated = validateRequiredString(referenceCode, { label: "Reference code", maxLength: 40 });
  if (!validated.ok) {
    return NextResponse.json({ error: validated.error }, { status: 400 });
  }

  const snapshot = await getAdminDb()
    .collection(COLLECTIONS.applications)
    .where("referenceCode", "==", validated.value.toUpperCase())
    .limit(1)
    .get();

  if (snapshot.empty) {
    return NextResponse.json({ error: NOT_FOUND_MESSAGE }, { status: 404 });
  }

  const application = snapshot.docs[0].data() as Application;

  return NextResponse.json({
    status: application.status,
    childName: application.childName,
    desiredStage: application.desiredStage,
    submittedAt: application.createdAt,
  });
});
