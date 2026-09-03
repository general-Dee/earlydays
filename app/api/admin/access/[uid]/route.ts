import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth, getAdminDb } from "@/lib/firebase/admin";
import { withSuperAdminRoute } from "@/lib/firebase/admin-auth";
import { COLLECTIONS } from "@/lib/firebase/collections";
import { logAdminAction } from "@/lib/audit";
import { checkRateLimit } from "@/lib/rate-limit";
import { validateAreas, validateDisplayName } from "../validation";

export const runtime = "nodejs";

export const PATCH = withSuperAdminRoute<{ params: { uid: string } }>(
  "PATCH /api/admin/access/[uid]",
  async (req: NextRequest, actor, { params }) => {
    if (!(await checkRateLimit(`admin-access-write:${actor.email}`, { max: 20, windowMs: 10 * 60 * 1000 }))) {
      return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 });
    }

    const { displayName, isSuperAdmin, areas, disabled } = (await req.json()) as {
      displayName?: string;
      isSuperAdmin?: unknown;
      areas?: unknown;
      disabled?: unknown;
    };

    if (displayName === undefined && isSuperAdmin === undefined && areas === undefined && disabled === undefined) {
      return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
    }

    if (params.uid === actor.uid && disabled === true) {
      return NextResponse.json({ error: "You can't disable your own account" }, { status: 400 });
    }

    const docRef = getAdminDb().collection(COLLECTIONS.adminUsers).doc(params.uid);
    const existing = await docRef.get();
    if (!existing.exists) {
      return NextResponse.json({ error: "This admin account no longer exists" }, { status: 404 });
    }

    const patch: Record<string, unknown> = { updatedAt: Date.now(), updatedBy: actor.email };

    if (displayName !== undefined) {
      const result = validateDisplayName(displayName);
      if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
      patch.displayName = result.value;
    }

    const nextIsSuperAdmin =
      isSuperAdmin !== undefined ? isSuperAdmin === true : (existing.data() as { isSuperAdmin: boolean }).isSuperAdmin;

    if (isSuperAdmin !== undefined) {
      patch.isSuperAdmin = nextIsSuperAdmin;
    }

    if (areas !== undefined || (isSuperAdmin !== undefined && nextIsSuperAdmin)) {
      const areasResult = validateAreas(areas ?? [], nextIsSuperAdmin);
      if (!areasResult.ok) return NextResponse.json({ error: areasResult.error }, { status: 400 });
      patch.areas = areasResult.value;
    }

    if (disabled !== undefined && typeof disabled !== "boolean") {
      return NextResponse.json({ error: "disabled must be true or false" }, { status: 400 });
    }

    if (disabled !== undefined) {
      try {
        await getAdminAuth().updateUser(params.uid, { disabled: disabled as boolean });
      } catch (err) {
        if (err instanceof Error && "code" in err && err.code === "auth/user-not-found") {
          return NextResponse.json({ error: "This admin account no longer exists" }, { status: 404 });
        }
        return NextResponse.json({ error: "Couldn't update the account. Please try again." }, { status: 500 });
      }

      // disabled: true only blocks new sign-ins/token refreshes — revoke
      // refresh tokens too so an already-signed-in admin is logged out now.
      if (disabled === true) {
        await getAdminAuth().revokeRefreshTokens(params.uid);
      }
    }

    await docRef.update(patch);

    await logAdminAction({
      action: disabled !== undefined ? (disabled ? "admin.disabled" : "admin.enabled") : "admin.updated",
      actorEmail: actor.email,
      targetUid: params.uid,
    });

    return NextResponse.json({ uid: params.uid, ...patch, ...(disabled !== undefined ? { disabled } : {}) });
  }
);

export const DELETE = withSuperAdminRoute<{ params: { uid: string } }>(
  "DELETE /api/admin/access/[uid]",
  async (req: NextRequest, actor, { params }) => {
    if (!(await checkRateLimit(`admin-access-write:${actor.email}`, { max: 20, windowMs: 10 * 60 * 1000 }))) {
      return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 });
    }

    if (params.uid === actor.uid) {
      return NextResponse.json({ error: "You can't remove your own admin access" }, { status: 400 });
    }

    await getAdminDb().collection(COLLECTIONS.adminUsers).doc(params.uid).delete();

    await logAdminAction({
      action: "admin.removed",
      actorEmail: actor.email,
      targetUid: params.uid,
    });

    return NextResponse.json({ uid: params.uid });
  }
);
