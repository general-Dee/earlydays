import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { requireAdminEmail } from "@/lib/firebase/admin-auth";
import { sendApplicationStatusEmail } from "@/lib/email/notify";
import type { Application, ApplicationStatus } from "@/lib/firebase/types";

export const runtime = "nodejs";

const VALID_STATUSES: ApplicationStatus[] = ["new", "reviewing", "accepted", "waitlisted", "declined"];

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const admin = await requireAdminEmail(req);
  if (admin instanceof NextResponse) return admin;

  const { status } = (await req.json()) as { status?: string };

  if (!status || !VALID_STATUSES.includes(status as ApplicationStatus)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const ref = getAdminDb().collection("applications").doc(params.id);
  const snapshot = await ref.get();
  if (!snapshot.exists) {
    return NextResponse.json({ error: "Application not found" }, { status: 404 });
  }

  await ref.update({ status });

  const application = snapshot.data() as Application;
  let emailSent = false;
  try {
    emailSent = await sendApplicationStatusEmail(
      {
        guardianName: application.guardianName,
        childName: application.childName,
        desiredStage: application.desiredStage,
        email: application.email,
      },
      status as ApplicationStatus
    );
  } catch (err) {
    console.error("Failed to send application status email", err);
  }

  return NextResponse.json({ ok: true, emailSent });
}
