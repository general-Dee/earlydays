import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { withAdminRoute } from "@/lib/firebase/admin-auth";
import { COLLECTIONS } from "@/lib/firebase/collections";
import { logAdminAction } from "@/lib/audit";
import type { Inquiry, InquiryStatus } from "@/lib/firebase/types";

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

    await logAdminAction({
      action: "inquiry.status_changed",
      actorEmail: admin.email,
      detail: status,
    });

    return NextResponse.json({ ok: true });
  }
);

export const DELETE = withAdminRoute<{ params: { id: string } }>(
  "inquiries",
  "DELETE /api/admin/inquiries/[id]",
  async (req: NextRequest, admin, { params }) => {
    const ref = getAdminDb().collection(COLLECTIONS.inquiries).doc(params.id);

    // Read before deleting so the audit entry names the person who enquired
    // rather than an opaque doc id. A missing doc still deletes as a no-op.
    const snap = await ref.get();
    const inquiry = snap.exists ? (snap.data() as Inquiry) : undefined;

    await ref.delete();

    await logAdminAction({
      action: "inquiry.deleted",
      actorEmail: admin.email,
      ...(inquiry?.email ? { targetEmail: inquiry.email } : {}),
      ...(inquiry?.name ? { detail: inquiry.name } : {}),
    });

    return NextResponse.json({ ok: true });
  }
);
