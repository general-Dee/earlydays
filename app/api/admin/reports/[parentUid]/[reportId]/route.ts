import { NextRequest, NextResponse } from "next/server";
import { getAdminBucket, getAdminDb } from "@/lib/firebase/admin";
import { withAdminRoute } from "@/lib/firebase/admin-auth";
import { logRouteError } from "@/lib/api/errors";
import { COLLECTIONS } from "@/lib/firebase/collections";
import { logAdminAction } from "@/lib/audit";
import type { ProgressReport } from "@/lib/firebase/types";

export const runtime = "nodejs";

export const DELETE = withAdminRoute<{ params: { parentUid: string; reportId: string } }>(
  "reports",
  "DELETE /api/admin/reports/[parentUid]/[reportId]",
  async (req: NextRequest, admin, { params }) => {
    const reportRef = getAdminDb()
      .collection(COLLECTIONS.parents)
      .doc(params.parentUid)
      .collection(COLLECTIONS.reports)
      .doc(params.reportId);

    const snap = await reportRef.get();
    if (snap.exists) {
      const { storagePath } = snap.data() as ProgressReport;
      await getAdminBucket()
        .file(storagePath)
        .delete()
        .catch((err) => {
          logRouteError("DELETE /api/admin/reports/[parentUid]/[reportId]", `failed to delete storage file ${storagePath}`, err);
        });
    }

    await reportRef.delete();

    await logAdminAction({
      action: "report.deleted",
      actorEmail: admin.email,
      targetUid: params.parentUid,
      ...(snap.exists
        ? { detail: `${(snap.data() as ProgressReport).childName} — ${(snap.data() as ProgressReport).term}` }
        : {}),
    });

    return NextResponse.json({ ok: true });
  }
);
