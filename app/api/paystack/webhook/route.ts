import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { getAdminDb } from "@/lib/firebase/admin";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
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
      await getAdminDb().doc(`parents/${uid}/payments/${reference}`).set(
        {
          status: "success",
          paidAt: Date.now(),
          channel,
          amountKobo: amount,
        },
        { merge: true }
      );
    }
  }

  return NextResponse.json({ received: true });
}
