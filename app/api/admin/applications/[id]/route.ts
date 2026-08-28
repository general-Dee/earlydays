import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { sendApplicationStatusEmail } from "@/lib/email/notify";
import { withAdminRoute } from "@/lib/firebase/admin-auth";
import { logRouteError } from "@/lib/api/errors";
import { COLLECTIONS } from "@/lib/firebase/collections";
import type { Application, ApplicationStatus } from "@/lib/firebase/types";

export const runtime = "nodejs";

const VALID_STATUSES: ApplicationStatus[] = ["new", "reviewing", "accepted", "waitlisted", "declined"];

export const PATCH = withAdminRoute<{ params: { id: string } }>(
  "applications",
  "PATCH /api/admin/applications/[id]",
  async (req: NextRequest, admin, { params }) => {
    const { status } = (await req.json()) as { status?: string };

    if (!status || !VALID_STATUSES.includes(status as ApplicationStatus)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const ref = getAdminDb().collection(COLLECTIONS.applications).doc(params.id);
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
      logRouteError("PATCH /api/admin/applications/[id]", "failed to send application status email", err);
    }

    return NextResponse.json({ ok: true, emailSent });
  }
);
