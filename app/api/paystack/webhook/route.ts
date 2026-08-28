import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { getAdminDb } from "@/lib/firebase/admin";
import { sendPaymentReceiptEmail } from "@/lib/email/notify";
import { logRouteError, withRouteErrorHandling } from "@/lib/api/errors";
import { paths } from "@/lib/firebase/collections";
import type { Parent, PaymentRecord } from "@/lib/firebase/types";

export const runtime = "nodejs";

export const POST = withRouteErrorHandling("POST /api/paystack/webhook", async (req: NextRequest) => {
  const secretKey = process.env.PAYSTACK_SECRET_KEY;
  if (!secretKey) {
    return NextResponse.json({ error: "Payments aren't configured yet" }, { status: 500 });
  }

  const rawBody = await req.text();
  const signature = req.headers.get("x-paystack-signature") ?? "";
  const expected = createHmac("sha512", secretKey).update(rawBody).digest("hex");

  const signatureValid =
    signature.length === expected.length &&
    timingSafeEqual(Buffer.from(signature), Buffer.from(expected));

  if (!signatureValid) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const event = JSON.parse(rawBody);

  if (event.event === "charge.success") {
    const { reference, amount, channel, metadata } = event.data;
    const uid = metadata?.uid;

    if (uid && reference) {
      const paymentRef = getAdminDb().doc(paths.payment(uid, reference));
      const existing = await paymentRef.get();

      if (!existing.exists || (existing.data() as PaymentRecord).status !== "success") {
        await paymentRef.set(
          {
            status: "success",
            paidAt: Date.now(),
            channel,
            amountKobo: amount,
          },
          { merge: true }
        );

        try {
          const payment = { ...(existing.data() as PaymentRecord | undefined), amountKobo: amount };
          const parentSnap = await getAdminDb().doc(paths.parent(uid)).get();

          if (parentSnap.exists && payment.childName && payment.term) {
            const parent = parentSnap.data() as Parent;
            await sendPaymentReceiptEmail(
              { guardianName: parent.guardianName, email: parent.email },
              { childName: payment.childName, term: payment.term, amountKobo: amount, reference }
            );
          }
        } catch (err) {
          logRouteError("POST /api/paystack/webhook", "failed to send payment receipt email", err);
        }
      }
    }
  }

  return NextResponse.json({ received: true });
});
