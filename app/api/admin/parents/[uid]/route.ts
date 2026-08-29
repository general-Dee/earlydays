import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth, getAdminDb } from "@/lib/firebase/admin";
import { withAdminRoute } from "@/lib/firebase/admin-auth";
import { COLLECTIONS } from "@/lib/firebase/collections";
import { validateChildren, validateEmail, validateGuardianName, validatePhone } from "../validation";

export const runtime = "nodejs";

export const PATCH = withAdminRoute<{ params: { uid: string } }>(
  "parents",
  "PATCH /api/admin/parents/[uid]",
  async (req: NextRequest, admin, { params }) => {
    const { guardianName, email, phone, children, disabled } = (await req.json()) as {
      guardianName?: string;
      email?: string;
      phone?: string;
      children?: unknown;
      disabled?: unknown;
    };

    if (
      guardianName === undefined &&
      email === undefined &&
      phone === undefined &&
      children === undefined &&
      disabled === undefined
    ) {
      return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
    }

    const patch: Record<string, unknown> = {};

    if (guardianName !== undefined) {
      const result = validateGuardianName(guardianName);
      if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
      patch.guardianName = result.value;
    }

    let trimmedEmail: string | undefined;
    if (email !== undefined) {
      const result = validateEmail(email);
      if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
      trimmedEmail = result.value;
      patch.email = trimmedEmail;
    }

    if (phone !== undefined) {
      const result = validatePhone(phone);
      if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
      patch.phone = result.value ?? "";
    }

    if (children !== undefined) {
      const result = validateChildren(children);
      if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
      patch.children = result.value;
    }

    if (disabled !== undefined && typeof disabled !== "boolean") {
      return NextResponse.json({ error: "disabled must be true or false" }, { status: 400 });
    }

    // Email and account-status changes go through the Admin Auth SDK — that's
    // the source of truth for both (email uniqueness is enforced there, and
    // `disabled` doesn't exist in Firestore at all).
    if (trimmedEmail !== undefined || disabled !== undefined) {
      try {
        await getAdminAuth().updateUser(params.uid, {
          ...(trimmedEmail !== undefined ? { email: trimmedEmail } : {}),
          ...(disabled !== undefined ? { disabled: disabled as boolean } : {}),
        });
      } catch (err) {
        if (err instanceof Error && "code" in err && err.code === "auth/email-already-exists") {
          return NextResponse.json({ error: "A parent account with this email already exists" }, { status: 409 });
        }
        if (err instanceof Error && "code" in err && err.code === "auth/user-not-found") {
          return NextResponse.json({ error: "This parent account no longer exists" }, { status: 404 });
        }
        return NextResponse.json({ error: "Couldn't update the account. Please try again." }, { status: 500 });
      }

      // disabled: true only blocks new sign-ins/token refreshes — revoke
      // refresh tokens too so an already-signed-in parent is logged out now.
      if (disabled === true) {
        await getAdminAuth().revokeRefreshTokens(params.uid);
      }
    }

    if (Object.keys(patch).length > 0) {
      await getAdminDb().collection(COLLECTIONS.parents).doc(params.uid).update(patch);
    }

    return NextResponse.json({ uid: params.uid, ...patch, ...(disabled !== undefined ? { disabled } : {}) });
  }
);
