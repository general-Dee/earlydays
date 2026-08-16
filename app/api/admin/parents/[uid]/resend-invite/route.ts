import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth, getAdminDb } from "@/lib/firebase/admin";
import { requireAdminEmail } from "@/lib/firebase/admin-auth";
import { sendParentInviteEmail } from "@/lib/email/notify";
import { site } from "@/lib/data";
import type { Parent } from "@/lib/firebase/types";

export const runtime = "nodejs";

export async function POST(req: NextRequest, { params }: { params: { uid: string } }) {
  const admin = await requireAdminEmail(req, "parents");
  if (admin instanceof NextResponse) return admin;

  const snapshot = await getAdminDb().collection("parents").doc(params.uid).get();
  if (!snapshot.exists) {
    return NextResponse.json({ error: "Parent account not found" }, { status: 404 });
  }

  const parent = snapshot.data() as Parent;

  let resetLink: string;
  try {
    resetLink = await getAdminAuth().generatePasswordResetLink(parent.email, { url: `${site.url}/portal` });
  } catch (err) {
    console.error("Failed to generate a password reset link", err);
    return NextResponse.json({ error: "Couldn't generate a new invite link. Please try again." }, { status: 500 });
  }

  let emailSent = false;
  try {
    emailSent = await sendParentInviteEmail({ guardianName: parent.guardianName, email: parent.email }, resetLink);
  } catch (err) {
    console.error("Failed to send parent invite email", err);
  }

  return NextResponse.json({ resetLink, emailSent });
}
