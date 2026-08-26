import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { withAdminRoute } from "@/lib/firebase/admin-auth";
import { validateChildren, validateGuardianName, validatePhone } from "../validation";

export const runtime = "nodejs";

export const PATCH = withAdminRoute<{ params: { uid: string } }>(
  "parents",
  "PATCH /api/admin/parents/[uid]",
  async (req: NextRequest, admin, { params }) => {
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
