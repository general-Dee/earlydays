import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { withAdminRoute } from "@/lib/firebase/admin-auth";
import { COLLECTIONS, paths } from "@/lib/firebase/collections";
import { FEE_BRACKETS } from "@/lib/fees";
import { feeKoboByStageCode, getFeeAmounts, setFeeAmounts } from "@/lib/feeSettings";
import { getCurrentTerm, setCurrentTerm } from "@/lib/termSettings";
import { TERMS } from "@/lib/data";
import type { Application, ApplicationStatus, Inquiry, Parent, PaymentRecord } from "@/lib/firebase/types";

export const runtime = "nodejs";

export const GET = withAdminRoute("dashboard", "GET /api/admin/dashboard", async (req: NextRequest, admin) => {
  const db = getAdminDb();
  const term = await getCurrentTerm();
  const feeAmounts = await getFeeAmounts();
  const feesByStage = feeKoboByStageCode(feeAmounts);

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
  // Fees are flat per-stage-per-term (see lib/feeSettings.ts), so a child's expected
  // amount is identical across every term — only "collected" varies by term, depending
  // on which term's payment record has status "success".
  const termTotals: Record<string, { amountCollectedKobo: number; amountExpectedKobo: number }> =
    Object.fromEntries(TERMS.map((t) => [t, { amountCollectedKobo: 0, amountExpectedKobo: 0 }]));

  for (const parentDoc of parentsSnap.docs) {
    const parent = parentDoc.data() as Parent;
    const paymentsSnap = await db.collection(paths.payments(parentDoc.id)).get();
    const payments = paymentsSnap.docs.map((d) => d.data() as PaymentRecord);

    for (const child of parent.children) {
      const expectedForChild = feesByStage[child.stage] ?? 0;

      for (const t of TERMS) {
        termTotals[t].amountExpectedKobo += expectedForChild;
        const paidForTerm = payments.find((p) => p.childId === child.id && p.term === t && p.status === "success");
        if (paidForTerm) termTotals[t].amountCollectedKobo += paidForTerm.amountKobo;
      }

      if (payments.some((p) => p.childId === child.id && p.term === term && p.status === "success")) {
        childrenPaid++;
      } else {
        childrenUnpaid++;
      }
    }
  }

  const termBreakdown = TERMS.map((t) => ({ term: t, ...termTotals[t] }));

  return NextResponse.json({
    term,
    applicationCounts,
    newInquiries,
    fees: { childrenPaid, childrenUnpaid, ...termTotals[term] },
    feeAmounts,
    termBreakdown,
  });
});

const VALID_BRACKET_IDS = new Set(FEE_BRACKETS.map((bracket) => bracket.id));

export const PATCH = withAdminRoute("dashboard", "PATCH /api/admin/dashboard", async (req: NextRequest, admin) => {
  const { currentTerm, feesKobo } = (await req.json()) as {
    currentTerm?: string;
    feesKobo?: Record<string, unknown>;
  };

  if (currentTerm === undefined && feesKobo === undefined) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  if (currentTerm !== undefined) {
    if (!TERMS.includes(currentTerm)) {
      return NextResponse.json({ error: "Please select a valid term" }, { status: 400 });
    }
    await setCurrentTerm(currentTerm, admin.email);
  }

  let updatedFeeAmounts: Record<string, number> | undefined;
  if (feesKobo !== undefined) {
    const entries = Object.entries(feesKobo);
    if (entries.length === 0) {
      return NextResponse.json({ error: "No fee amounts provided" }, { status: 400 });
    }
    const validated: Record<string, number> = {};
    for (const [id, amount] of entries) {
      if (!VALID_BRACKET_IDS.has(id)) {
        return NextResponse.json({ error: `Unknown fee bracket "${id}"` }, { status: 400 });
      }
      if (typeof amount !== "number" || !Number.isInteger(amount) || amount <= 0) {
        return NextResponse.json({ error: `Invalid amount for "${id}"` }, { status: 400 });
      }
      validated[id] = amount;
    }
    await setFeeAmounts(validated, admin.email);
    updatedFeeAmounts = validated;
  }

  return NextResponse.json({
    ...(currentTerm !== undefined ? { term: currentTerm } : {}),
    ...(updatedFeeAmounts !== undefined ? { feeAmounts: updatedFeeAmounts } : {}),
  });
});
