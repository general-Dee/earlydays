import { randomBytes } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth, getAdminDb } from "@/lib/firebase/admin";
import { withSuperAdminRoute } from "@/lib/firebase/admin-auth";
import { logRouteError } from "@/lib/api/errors";
import { COLLECTIONS } from "@/lib/firebase/collections";
import { sendAdminInviteEmail } from "@/lib/email/notify";
import { logAdminAction } from "@/lib/audit";
import { checkRateLimit } from "@/lib/rate-limit";
import { site } from "@/lib/data";
import { validateAreas, validateDisplayName, validateEmail } from "./validation";
import type { AdminUser } from "@/lib/firebase/types";

export const runtime = "nodejs";

const GET_USERS_BATCH_SIZE = 100;

export const GET = withSuperAdminRoute("GET /api/admin/access", async (req: NextRequest) => {
  const snapshot = await getAdminDb().collection(COLLECTIONS.adminUsers).orderBy("createdAt", "desc").get();
  const admins = snapshot.docs.map((doc) => doc.data() as AdminUser);

  // `disabled` lives only on the Firebase Auth user record, never in
  // Firestore — batch it in (getUsers caps at 100 identifiers per call)
  // rather than denormalizing a second source of truth.
  const disabledByUid = new Map<string, boolean>();
  for (let i = 0; i < admins.length; i += GET_USERS_BATCH_SIZE) {
    const chunk = admins.slice(i, i + GET_USERS_BATCH_SIZE);
    const { users } = await getAdminAuth().getUsers(chunk.map((a) => ({ uid: a.uid })));
    for (const user of users) disabledByUid.set(user.uid, user.disabled);
  }

  const withStatus = admins.map((a) => ({ ...a, disabled: disabledByUid.get(a.uid) ?? false }));

  return NextResponse.json({ admins: withStatus });
});

export const POST = withSuperAdminRoute("POST /api/admin/access", async (req: NextRequest, actor) => {
  // This is a privilege-escalation surface, so it gets the same throttling
  // as the public admissions/contact forms — keyed by actor rather than IP
  // since the caller is already an authenticated superadmin.
  if (!(await checkRateLimit(`admin-access-write:${actor.email}`, { max: 20, windowMs: 10 * 60 * 1000 }))) {
    return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 });
  }

  const { displayName, email, isSuperAdmin, areas } = (await req.json()) as {
    displayName?: string;
    email?: string;
    isSuperAdmin?: unknown;
    areas?: unknown;
  };

  const displayNameResult = validateDisplayName(displayName);
  if (!displayNameResult.ok) return NextResponse.json({ error: displayNameResult.error }, { status: 400 });

  const emailResult = validateEmail(email);
  if (!emailResult.ok) return NextResponse.json({ error: emailResult.error }, { status: 400 });

  const superAdminFlag = isSuperAdmin === true;

  const areasResult = validateAreas(areas, superAdminFlag);
  if (!areasResult.ok) return NextResponse.json({ error: areasResult.error }, { status: 400 });

  const trimmedDisplayName = displayNameResult.value;
  const trimmedEmail = emailResult.value;

  let uid: string;
  try {
    const userRecord = await getAdminAuth().createUser({
      email: trimmedEmail,
      password: randomBytes(24).toString("base64url"),
      displayName: trimmedDisplayName,
    });
    uid = userRecord.uid;
  } catch (err) {
    if (err instanceof Error && "code" in err && err.code === "auth/email-already-exists") {
      return NextResponse.json({ error: "An account with this email already exists" }, { status: 409 });
    }
    return NextResponse.json({ error: "Couldn't create the account. Please try again." }, { status: 500 });
  }

  const adminUser: AdminUser = {
    uid,
    email: trimmedEmail,
    displayName: trimmedDisplayName,
    isSuperAdmin: superAdminFlag,
    areas: areasResult.value,
    createdAt: Date.now(),
    createdBy: actor.email,
  };

  try {
    await getAdminDb().collection(COLLECTIONS.adminUsers).doc(uid).set(adminUser);
  } catch (err) {
    logRouteError("POST /api/admin/access", `failed to save adminUsers doc; rolling back Auth user ${uid}`, err);
    await getAdminAuth()
      .deleteUser(uid)
      .catch(() => {});
    return NextResponse.json({ error: "Couldn't save this admin. Please try again." }, { status: 500 });
  }

  let resetLink: string | null = null;
  try {
    resetLink = await getAdminAuth().generatePasswordResetLink(trimmedEmail, { url: `${site.url}/admin` });
  } catch (err) {
    logRouteError("POST /api/admin/access", "failed to generate a password reset link", err);
  }

  let emailSent = false;
  if (resetLink) {
    try {
      emailSent = await sendAdminInviteEmail({ displayName: trimmedDisplayName, email: trimmedEmail }, resetLink);
    } catch (err) {
      logRouteError("POST /api/admin/access", "failed to send admin invite email", err);
    }
  }

  await logAdminAction({
    action: "admin.created",
    actorEmail: actor.email,
    targetUid: uid,
    targetEmail: trimmedEmail,
    detail: superAdminFlag ? "superadmin" : areasResult.value.join(", "),
  });

  return NextResponse.json({ ...adminUser, resetLink, emailSent });
});
