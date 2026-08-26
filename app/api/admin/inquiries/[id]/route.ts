import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { withAdminRoute } from "@/lib/firebase/admin-auth";
import { COLLECTIONS } from "@/lib/firebase/collections";
import type { InquiryStatus } from "@/lib/firebase/types";

export const runtime = "nodejs";

const VALID_STATUSES: InquiryStatus[] = ["new", "contacted", "resolved"];

export const PATCH = withAdminRoute<{ params: { id: string } }>(
  "inquiries",
  "PATCH /api/admin/inquiries/[id]",
  async (req: NextRequest, admin, { params }) => {
    const { status } = (await req.json()) as { status?: string };

    if (!status || !VALID_STATUSES.includes(status as InquiryStatus)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    await getAdminDb().collection(COLLECTIONS.inquiries).doc(params.id).update({ status });

    return NextResponse.json({ ok: true });
  }
);
