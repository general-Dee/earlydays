import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { requireAdminEmail } from "@/lib/firebase/admin-auth";
import type { InquiryStatus } from "@/lib/firebase/types";

export const runtime = "nodejs";

const VALID_STATUSES: InquiryStatus[] = ["new", "contacted", "resolved"];

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const admin = await requireAdminEmail(req, "inquiries");
  if (admin instanceof NextResponse) return admin;

  const { status } = (await req.json()) as { status?: string };

  if (!status || !VALID_STATUSES.includes(status as InquiryStatus)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  await getAdminDb().collection("inquiries").doc(params.id).update({ status });

  return NextResponse.json({ ok: true });
}
