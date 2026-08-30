import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { withAdminRoute } from "@/lib/firebase/admin-auth";
import { COLLECTIONS, paths } from "@/lib/firebase/collections";
import type { Parent, PaymentRecord } from "@/lib/firebase/types";

export const runtime = "nodejs";

export type AdminPaymentRow = PaymentRecord & {
  parentUid: string;
  guardianName: string;
  guardianEmail: string;
};

export const GET = withAdminRoute("payments", "GET /api/admin/payments", async (req: NextRequest, admin) => {
  const db = getAdminDb();

  // Mirrors app/api/admin/dashboard/route.ts's traversal: one payments-subcollection
  // read per parent. Fine at current school size — same tradeoff the dashboard and
  // fee-reminders cron already make, and no Firestore collection-group index exists
  // (or is deployable) in this repo yet.
  const parentsSnap = await db.collection(COLLECTIONS.parents).get();
  const payments: AdminPaymentRow[] = [];

  for (const parentDoc of parentsSnap.docs) {
    const parent = parentDoc.data() as Parent;
    const paymentsSnap = await db.collection(paths.payments(parentDoc.id)).get();

    for (const paymentDoc of paymentsSnap.docs) {
      const payment = paymentDoc.data() as PaymentRecord;
      payments.push({
        ...payment,
        parentUid: parentDoc.id,
        guardianName: parent.guardianName,
        guardianEmail: parent.email,
      });
    }
  }

  payments.sort((a, b) => b.createdAt - a.createdAt);

  return NextResponse.json({ payments });
});
