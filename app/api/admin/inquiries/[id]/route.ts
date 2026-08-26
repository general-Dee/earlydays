import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { requireAdminEmail } from "@/lib/firebase/admin-auth";
import { withRouteErrorHandling } from "@/lib/api/errors";
import type { InquiryStatus } from "@/lib/firebase/types";

export const runtime = "nodejs";

const VALID_STATUSES: InquiryStatus[] = ["new", "contacted", "resolved"];

export const PATCH = withRouteErrorHandling<{ params: { id: string } }>(
  "PATCH /api/admin/inquiries/[id]",
  async (req: NextRequest, { params }) => {
    const admin = await requireAdminEmail(req, "inquiries");
    if (admin instanceof NextResponse) return admin;

    const { status } = (await req.json()) as { status?: string };

    if (!status || !VALID_STATUSES.includes(status as InquiryStatus)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    await getAdminDb().collection("inquiries").doc(params.id).update({ status });

    return NextResponse.json({ ok: true });
  }
);
