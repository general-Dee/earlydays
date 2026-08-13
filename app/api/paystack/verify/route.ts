import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth, getAdminDb } from "@/lib/firebase/admin";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Missing Authorization header" }, { status: 401 });
  }

  let uid: string;
  try {
    const decoded = await getAdminAuth().verifyIdToken(authHeader.slice("Bearer ".length));
    uid = decoded.uid;
  } catch {
    return NextResponse.json({ error: "Invalid or expired session" }, { status: 401 });
  }

  const { reference } = (await req.json()) as { reference?: string };
  if (!reference) {
    return NextResponse.json({ error: "reference is required" }, { status: 400 });
  }

  const paymentRef = getAdminDb().doc(`parents/${uid}/payments/${reference}`);
  const paymentSnap = await paymentRef.get();
  if (!paymentSnap.exists) {
    return NextResponse.json({ error: "Payment not found" }, { status: 404 });
  }
  const payment = paymentSnap.data()!;

  const secretKey = process.env.PAYSTACK_SECRET_KEY;
  if (!secretKey) {
    return NextResponse.json({ error: "Payments aren't configured yet" }, { status: 500 });
  }

  const paystackRes = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
    headers: { Authorization: `Bearer ${secretKey}` },
  });
  const paystackData = await paystackRes.json();

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
