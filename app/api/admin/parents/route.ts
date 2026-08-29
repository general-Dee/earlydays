import { randomBytes } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth, getAdminDb } from "@/lib/firebase/admin";
import { withAdminRoute } from "@/lib/firebase/admin-auth";
import { logRouteError } from "@/lib/api/errors";
import { COLLECTIONS } from "@/lib/firebase/collections";
import { sendParentInviteEmail } from "@/lib/email/notify";
import { site } from "@/lib/data";
import { validateChildren, validateEmail, validateGuardianName, validatePhone } from "./validation";
import type { Parent } from "@/lib/firebase/types";

export const runtime = "nodejs";

const GET_USERS_BATCH_SIZE = 100;

export const GET = withAdminRoute("parents", "GET /api/admin/parents", async (req: NextRequest, admin) => {
  const snapshot = await getAdminDb().collection(COLLECTIONS.parents).orderBy("createdAt", "desc").get();
  const parents = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as { id: string } & Parent);

  // `disabled` lives only on the Firebase Auth user record, never in Firestore —
  // batch it in (getUsers caps at 100 identifiers per call) rather than
  // denormalizing a second source of truth.
  const disabledByUid = new Map<string, boolean>();
  for (let i = 0; i < parents.length; i += GET_USERS_BATCH_SIZE) {
    const chunk = parents.slice(i, i + GET_USERS_BATCH_SIZE);
    const { users } = await getAdminAuth().getUsers(chunk.map((p) => ({ uid: p.uid })));
    for (const user of users) disabledByUid.set(user.uid, user.disabled);
  }

  const withStatus = parents.map((p) => ({ ...p, disabled: disabledByUid.get(p.uid) ?? false }));

  return NextResponse.json({ parents: withStatus });
});

export const POST = withAdminRoute("parents", "POST /api/admin/parents", async (req: NextRequest, admin) => {
  const { guardianName, email, phone, children } = (await req.json()) as {
    guardianName?: string;
    email?: string;
    phone?: string;
    children?: unknown;
  };

  const guardianNameResult = validateGuardianName(guardianName);
  if (!guardianNameResult.ok) return NextResponse.json({ error: guardianNameResult.error }, { status: 400 });

  const emailResult = validateEmail(email);
  if (!emailResult.ok) return NextResponse.json({ error: emailResult.error }, { status: 400 });

  const phoneResult = validatePhone(phone);
  if (!phoneResult.ok) return NextResponse.json({ error: phoneResult.error }, { status: 400 });

  const childrenResult = validateChildren(children);
  if (!childrenResult.ok) return NextResponse.json({ error: childrenResult.error }, { status: 400 });

  const trimmedGuardianName = guardianNameResult.value;
  const trimmedEmail = emailResult.value;
  const trimmedPhone = phoneResult.value;
  const preparedChildren = childrenResult.value;

  let uid: string;
  try {
    const userRecord = await getAdminAuth().createUser({
      email: trimmedEmail,
      password: randomBytes(24).toString("base64url"),
      displayName: trimmedGuardianName,
    });
    uid = userRecord.uid;
  } catch (err) {
    if (err instanceof Error && "code" in err && err.code === "auth/email-already-exists") {
      return NextResponse.json({ error: "A parent account with this email already exists" }, { status: 409 });
    }
    return NextResponse.json({ error: "Couldn't create the account. Please try again." }, { status: 500 });
  }

  const parent: Parent = {
    uid,
    guardianName: trimmedGuardianName,
    email: trimmedEmail,
    ...(trimmedPhone ? { phone: trimmedPhone } : {}),
    children: preparedChildren,
    createdAt: Date.now(),
  };

  try {
    await getAdminDb().collection(COLLECTIONS.parents).doc(uid).set(parent);
  } catch {
    await getAdminAuth()
      .deleteUser(uid)
      .catch(() => {});
    return NextResponse.json({ error: "Couldn't save the parent record. Please try again." }, { status: 500 });
  }

  let resetLink: string | null = null;
  try {
    resetLink = await getAdminAuth().generatePasswordResetLink(trimmedEmail, { url: `${site.url}/portal` });
  } catch (err) {
    logRouteError("POST /api/admin/parents", "failed to generate a password reset link", err);
  }

  let emailSent = false;
  if (resetLink) {
    try {
      emailSent = await sendParentInviteEmail({ guardianName: trimmedGuardianName, email: trimmedEmail }, resetLink);
    } catch (err) {
      logRouteError("POST /api/admin/parents", "failed to send parent invite email", err);
    }
  }

  return NextResponse.json({ ...parent, resetLink, emailSent });
});
