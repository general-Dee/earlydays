import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { handleRouteError } from "@/lib/api/errors";
import { withAuthenticatedRoute } from "@/lib/firebase/admin-auth";
import { paths } from "@/lib/firebase/collections";

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

    const secretKey = process.env.PAYSTACK_SECRET_KEY;
    if (!secretKey) {
      return NextResponse.json({ error: "Payments aren't configured yet" }, { status: 500 });
    }

    let paystackRes: Response;
    let paystackData: any;
    try {
      paystackRes = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
        headers: { Authorization: `Bearer ${secretKey}` },
      });
      paystackData = await paystackRes.json();
    } catch (err) {
      return handleRouteError(err, "POST /api/paystack/verify", {
        status: 502,
        message: "Could not verify payment with Paystack",
      });
    }

    const verified =
      paystackRes.ok &&
      paystackData.status &&
      paystackData.data.status === "success" &&
      paystackData.data.amount === payment.amountKobo;

    if (!verified) {
      await paymentRef.set({ status: "failed" }, { merge: true });
      return NextResponse.json({ status: "failed" }, { status: 200 });
    }

    await paymentRef.set(
      {
        status: "success",
        paidAt: Date.now(),
        channel: paystackData.data.channel,
      },
      { merge: true }
    );

    return NextResponse.json({ status: "success" });
  }
);
