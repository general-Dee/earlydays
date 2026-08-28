import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth, getAdminDb } from "@/lib/firebase/admin";
import { withAdminRoute } from "@/lib/firebase/admin-auth";
import { logRouteError } from "@/lib/api/errors";
import { COLLECTIONS } from "@/lib/firebase/collections";
import { sendParentInviteEmail } from "@/lib/email/notify";
import { site } from "@/lib/data";
import type { Parent } from "@/lib/firebase/types";

export const runtime = "nodejs";

export const POST = withAdminRoute<{ params: { uid: string } }>(
  "parents",
  "POST /api/admin/parents/[uid]/resend-invite",
  async (req: NextRequest, admin, { params }) => {
    const snapshot = await getAdminDb().collection(COLLECTIONS.parents).doc(params.uid).get();
    if (!snapshot.exists) {
      return NextResponse.json({ error: "Parent account not found" }, { status: 404 });
    }

    const parent = snapshot.data() as Parent;

    let resetLink: string;
    try {
      resetLink = await getAdminAuth().generatePasswordResetLink(parent.email, { url: `${site.url}/portal` });
    } catch (err) {
      logRouteError("POST /api/admin/parents/[uid]/resend-invite", "failed to generate a password reset link", err);
      return NextResponse.json({ error: "Couldn't generate a new invite link. Please try again." }, { status: 500 });
    }

    let emailSent = false;
    try {
      emailSent = await sendParentInviteEmail({ guardianName: parent.guardianName, email: parent.email }, resetLink);
    } catch (err) {
      logRouteError("POST /api/admin/parents/[uid]/resend-invite", "failed to send parent invite email", err);
    }

    return NextResponse.json({ resetLink, emailSent });
  }
);
