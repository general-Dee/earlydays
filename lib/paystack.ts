export type PaystackVerifyResult = {
  ok: boolean;
  status: string;
  amountKobo?: number;
  channel?: string;
};

// Shared by app/api/paystack/verify/route.ts (parent-facing, called right
// after checkout) and app/api/admin/payments/[reference]/route.ts (admin
// reconciliation for a payment stuck "pending" from a missed webhook).
// Throws on a missing PAYSTACK_SECRET_KEY or a network failure — callers
// are expected to wrap this in their own error handling.
export async function verifyPaystackTransaction(reference: string): Promise<PaystackVerifyResult> {
  const secretKey = process.env.PAYSTACK_SECRET_KEY;
  if (!secretKey) {
    throw new Error("Payments aren't configured yet");
  }

  const res = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
    headers: { Authorization: `Bearer ${secretKey}` },
  });
  const data = await res.json();

  return {
    ok: res.ok && Boolean(data.status),
    status: data.data?.status ?? "",
    amountKobo: data.data?.amount,
    channel: data.data?.channel,
  };
}
