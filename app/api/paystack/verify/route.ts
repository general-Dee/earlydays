import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { handleRouteError } from "@/lib/api/errors";
import { withAuthenticatedRoute } from "@/lib/firebase/admin-auth";
import { paths } from "@/lib/firebase/collections";
import { verifyPaystackTransaction, type PaystackVerifyResult } from "@/lib/paystack";

export const runtime = "nodejs";

export const POST = withAuthenticatedRoute(
  "POST /api/paystack/verify",
  async (req: NextRequest, { uid }) => {
    const { reference } = (await req.json()) as { reference?: string };
    if (!reference) {
      return NextResponse.json({ error: "reference is required" }, { status: 400 });
    }

    const paymentRef = getAdminDb().doc(paths.payment(uid, reference));
    const paymentSnap = await paymentRef.get();
    if (!paymentSnap.exists) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }
    const payment = paymentSnap.data()!;

    let result: PaystackVerifyResult;
    try {
      result = await verifyPaystackTransaction(reference);
    } catch (err) {
      if (err instanceof Error && err.message === "Payments aren't configured yet") {
        return NextResponse.json({ error: err.message }, { status: 500 });
      }
      return handleRouteError(err, "POST /api/paystack/verify", {
        status: 502,
        message: "Could not verify payment with Paystack",
      });
    }

    const verified = result.ok && result.status === "success" && result.amountKobo === payment.amountKobo;

    if (!verified) {
      await paymentRef.set({ status: "failed" }, { merge: true });
      return NextResponse.json({ status: "failed" }, { status: 200 });
    }

    await paymentRef.set(
      {
        status: "success",
        paidAt: Date.now(),
        channel: result.channel,
      },
      { merge: true }
    );

    return NextResponse.json({ status: "success" });
  }
);
