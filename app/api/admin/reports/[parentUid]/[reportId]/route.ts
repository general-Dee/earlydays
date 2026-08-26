import { NextRequest, NextResponse } from "next/server";
import { getAdminBucket, getAdminDb } from "@/lib/firebase/admin";
import { requireAdminEmail } from "@/lib/firebase/admin-auth";
import { withRouteErrorHandling } from "@/lib/api/errors";
import type { ProgressReport } from "@/lib/firebase/types";

export const runtime = "nodejs";

export const DELETE = withRouteErrorHandling<{ params: { parentUid: string; reportId: string } }>(
  "DELETE /api/admin/reports/[parentUid]/[reportId]",
  async (req: NextRequest, { params }) => {
    const admin = await requireAdminEmail(req, "reports");
    if (admin instanceof NextResponse) return admin;

    const reportRef = getAdminDb()
      .collection("parents")
      .doc(params.parentUid)
      .collection("reports")
      .doc(params.reportId);

    const snap = await reportRef.get();
    if (snap.exists) {
      const { storagePath } = snap.data() as ProgressReport;
      await getAdminBucket()
        .file(storagePath)
        .delete()
        .catch((err) => {
          console.error(`[api] DELETE /api/admin/reports/[parentUid]/[reportId] failed to delete storage file ${storagePath}`, err);
        });
    }

    await reportRef.delete();

    return NextResponse.json({ ok: true });
  }
);
