import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { withAdminRoute } from "@/lib/firebase/admin-auth";
import { handleRouteError, logRouteError } from "@/lib/api/errors";
import { logAdminAction } from "@/lib/audit";
import { paths } from "@/lib/firebase/collections";
import { sendPaymentReceiptEmail } from "@/lib/email/notify";
import { verifyPaystackTransaction, type PaystackVerifyResult } from "@/lib/paystack";
import type { Parent, PaymentRecord } from "@/lib/firebase/types";

export const runtime = "nodejs";

export const GET = withAdminRoute<{ params: { reference: string } }>(
  "payments",
  "GET /api/admin/payments/[reference]",
  async (req: NextRequest, admin, { params }) => {
    const uid = req.nextUrl.searchParams.get("uid");
    if (!uid) {
      return NextResponse.json({ error: "uid is required" }, { status: 400 });
    }

    const db = getAdminDb();
    const paymentSnap = await db.doc(paths.payment(uid, params.reference)).get();
    if (!paymentSnap.exists) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }

    const parentSnap = await db.doc(paths.parent(uid)).get();
    const parent = parentSnap.exists ? (parentSnap.data() as Parent) : undefined;

    return NextResponse.json({
      payment: paymentSnap.data() as PaymentRecord,
      guardianName: parent?.guardianName ?? "",
      guardianEmail: parent?.email ?? "",
    });
  }
);

// Re-verifies a payment stuck "pending" against Paystack directly, for when
// the webhook that would normally resolve it was missed (network blip,
// Paystack outage, misconfigured webhook URL). Deliberately scoped to only
// "pending" payments so it can't be used to flip an already-resolved one.
export const POST = withAdminRoute<{ params: { reference: string } }>(
  "payments",
  "POST /api/admin/payments/[reference]",
  async (req: NextRequest, admin, { params }) => {
    const { uid } = (await req.json()) as { uid?: string };
    if (!uid) {
      return NextResponse.json({ error: "uid is required" }, { status: 400 });
    }

    const db = getAdminDb();
    const paymentRef = db.doc(paths.payment(uid, params.reference));
    const paymentSnap = await paymentRef.get();
    if (!paymentSnap.exists) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }

    const payment = paymentSnap.data() as PaymentRecord;
    if (payment.status !== "pending") {
      return NextResponse.json({ error: "Only pending payments can be reconciled" }, { status: 400 });
    }

    let result: PaystackVerifyResult;
    try {
      result = await verifyPaystackTransaction(params.reference);
    } catch (err) {
      if (err instanceof Error && err.message === "Payments aren't configured yet") {
        return NextResponse.json({ error: err.message }, { status: 500 });
      }
      return handleRouteError(err, "POST /api/admin/payments/[reference]", {
        status: 502,
        message: "Could not verify payment with Paystack",
      });
    }

    const verified = result.ok && result.status === "success" && result.amountKobo === payment.amountKobo;
    const newStatus = verified ? "success" : "failed";

    if (verified) {
      await paymentRef.set({ status: "success", paidAt: Date.now(), channel: result.channel }, { merge: true });
    } else {
      await paymentRef.set({ status: "failed" }, { merge: true });
    }

    await logAdminAction({
      action: "payment.reconciled",
      actorEmail: admin.email,
      targetUid: uid,
      detail: `${params.reference}: ${newStatus}`,
    });

    let emailSent = false;
    if (verified) {
      try {
        const parentSnap = await db.doc(paths.parent(uid)).get();
        if (parentSnap.exists) {
          const parent = parentSnap.data() as Parent;
          emailSent = await sendPaymentReceiptEmail(
            { guardianName: parent.guardianName, email: parent.email },
            { childName: payment.childName, term: payment.term, amountKobo: payment.amountKobo, reference: params.reference }
          );
        }
      } catch (err) {
        logRouteError("POST /api/admin/payments/[reference]", "failed to send payment receipt email", err);
      }
    }

    return NextResponse.json({ status: newStatus, emailSent });
  }
);
