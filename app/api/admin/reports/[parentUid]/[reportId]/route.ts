import { NextRequest, NextResponse } from "next/server";
import { getAdminBucket, getAdminDb } from "@/lib/firebase/admin";
import { withAdminRoute } from "@/lib/firebase/admin-auth";
import { logRouteError } from "@/lib/api/errors";
import { COLLECTIONS } from "@/lib/firebase/collections";
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

    return NextResponse.json({ ok: true });
  }
);
