import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { getAdminAuth, getAdminDb } from "@/lib/firebase/admin";
import { getFeeKobo } from "@/lib/fees";
import { handleRouteError, withRouteErrorHandling } from "@/lib/api/errors";
import { paths } from "@/lib/firebase/collections";
import type { Parent } from "@/lib/firebase/types";

export const runtime = "nodejs";

export const POST = withRouteErrorHandling("POST /api/paystack/initialize", async (req: NextRequest) => {
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

  const { childId, term } = (await req.json()) as { childId?: string; term?: string };
  if (!childId || !term) {
    return NextResponse.json({ error: "childId and term are required" }, { status: 400 });
  }

  const parentSnap = await getAdminDb().doc(paths.parent(uid)).get();
  if (!parentSnap.exists) {
    return NextResponse.json({ error: "No parent record found for this account" }, { status: 404 });
  }

  const parent = parentSnap.data() as Parent;
  const child = parent.children.find((c) => c.id === childId);
  if (!child) {
    return NextResponse.json({ error: "That child isn't linked to your account" }, { status: 403 });
  }

  let amountKobo: number;
  try {
    amountKobo = getFeeKobo(child.stage);
  } catch {
    return NextResponse.json({ error: "No fee configured for this stage — contact the school" }, { status: 500 });
  }

  const secretKey = process.env.PAYSTACK_SECRET_KEY;
  if (!secretKey) {
    return NextResponse.json({ error: "Payments aren't configured yet" }, { status: 500 });
  }

  const reference = `edy_${randomUUID()}`;

  let paystackRes: Response;
  let paystackData: any;
  try {
    paystackRes = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secretKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: parent.email,
        amount: amountKobo,
        reference,
        metadata: { uid, childId, term },
      }),
    });
    paystackData = await paystackRes.json();
  } catch (err) {
    return handleRouteError(err, "POST /api/paystack/initialize", {
      status: 502,
      message: "Could not start payment with Paystack",
    });
  }

  if (!paystackRes.ok || !paystackData.status) {
    return NextResponse.json({ error: "Could not start payment with Paystack" }, { status: 502 });
  }

  await getAdminDb().doc(paths.payment(uid, reference)).set({
    reference,
    childId,
    childName: child.name,
    term,
    amountKobo,
    status: "pending",
    createdAt: Date.now(),
  });

  return NextResponse.json({
    accessCode: paystackData.data.access_code,
    reference,
  });
});
