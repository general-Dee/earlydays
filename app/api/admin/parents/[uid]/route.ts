import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { requireAdminEmail } from "@/lib/firebase/admin-auth";
import { withRouteErrorHandling } from "@/lib/api/errors";
import { validateChildren, validateGuardianName, validatePhone } from "../validation";

export const runtime = "nodejs";

export const PATCH = withRouteErrorHandling<{ params: { uid: string } }>(
  "PATCH /api/admin/parents/[uid]",
  async (req: NextRequest, { params }) => {
    const admin = await requireAdminEmail(req, "parents");
    if (admin instanceof NextResponse) return admin;

    const { guardianName, phone, children } = (await req.json()) as {
      guardianName?: string;
      phone?: string;
      children?: unknown;
    };

    if (guardianName === undefined && phone === undefined && children === undefined) {
      return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
    }

    const patch: Record<string, unknown> = {};

    if (guardianName !== undefined) {
      const result = validateGuardianName(guardianName);
      if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
      patch.guardianName = result.value;
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

    await getAdminDb().collection("parents").doc(params.uid).update(patch);

    return NextResponse.json({ uid: params.uid, ...patch });
  }
);
