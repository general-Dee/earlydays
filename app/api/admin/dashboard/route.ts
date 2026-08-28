import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { withAdminRoute } from "@/lib/firebase/admin-auth";
import { COLLECTIONS, paths } from "@/lib/firebase/collections";
import { CURRENT_TERM, FEE_BY_STAGE } from "@/lib/fees";
import type { Application, ApplicationStatus, Inquiry, Parent, PaymentRecord } from "@/lib/firebase/types";

export const runtime = "nodejs";

export const GET = withAdminRoute("dashboard", "GET /api/admin/dashboard", async (req: NextRequest, admin) => {
  const db = getAdminDb();

  const applicationsSnap = await db.collection(COLLECTIONS.applications).get();
  const applicationCounts: Record<ApplicationStatus, number> = {
    new: 0,
    reviewing: 0,
    accepted: 0,
    waitlisted: 0,
    declined: 0,
  };
  applicationsSnap.docs.forEach((doc) => {
    const status = (doc.data() as Application).status;
    applicationCounts[status] = (applicationCounts[status] ?? 0) + 1;
  });

  const inquiriesSnap = await db.collection(COLLECTIONS.inquiries).get();
  const newInquiries = inquiriesSnap.docs.filter((doc) => (doc.data() as Inquiry).status === "new").length;

  // Mirrors app/api/cron/fee-reminders/route.ts's traversal: one payments-subcollection
  // read per parent. Fine at current school size — same tradeoff the cron job already
  // makes, and no Firestore count()/sum() aggregation queries exist anywhere in this repo
  // yet. Revisit with aggregation queries or a precomputed stats doc if parent count grows.
  const parentsSnap = await db.collection(COLLECTIONS.parents).get();
  let childrenPaid = 0;
  let childrenUnpaid = 0;
  let amountCollectedKobo = 0;
  let amountExpectedKobo = 0;

  for (const parentDoc of parentsSnap.docs) {
    const parent = parentDoc.data() as Parent;
    const paymentsSnap = await db.collection(paths.payments(parentDoc.id)).get();
    const payments = paymentsSnap.docs.map((d) => d.data() as PaymentRecord);

    for (const child of parent.children) {
      const successfulPayment = payments.find(
        (p) => p.childId === child.id && p.term === CURRENT_TERM && p.status === "success"
      );
      amountExpectedKobo += FEE_BY_STAGE[child.stage] ?? 0;

      if (successfulPayment) {
        childrenPaid++;
        amountCollectedKobo += successfulPayment.amountKobo;
      } else {
        childrenUnpaid++;
      }
    }
  }

  return NextResponse.json({
    term: CURRENT_TERM,
    applicationCounts,
    newInquiries,
    fees: { childrenPaid, childrenUnpaid, amountCollectedKobo, amountExpectedKobo },
  });
});
