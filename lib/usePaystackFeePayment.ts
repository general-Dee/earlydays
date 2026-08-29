"use client";

import { useState } from "react";
import type { User } from "firebase/auth";

declare global {
  interface Window {
    PaystackPop?: {
      resumeTransaction: (
        accessCode: string,
        options: {
          onSuccess?: () => void;
          onCancel?: () => void;
        }
      ) => void;
    };
  }
}

const VERIFY_RETRY_DELAYS_MS = [1000, 2000];

export type PayStatus = "idle" | "starting" | "verifying" | "success" | "error";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function verifyPayment(idToken: string, reference: string): Promise<{ status?: string }> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= VERIFY_RETRY_DELAYS_MS.length; attempt++) {
    try {
      const res = await fetch("/api/paystack/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({ reference }),
      });

      if (res.ok) {
        return await res.json();
      }
      if (res.status < 500) {
        return await res.json();
      }
      lastError = new Error(`Verify request failed with status ${res.status}`);
    } catch (err) {
      lastError = err;
    }

    if (attempt < VERIFY_RETRY_DELAYS_MS.length) {
      await sleep(VERIFY_RETRY_DELAYS_MS[attempt]);
    }
  }

  throw lastError instanceof Error ? lastError : new Error("Verify request failed");
}

export function usePaystackFeePayment({ user }: { user: User | null }) {
  const [payStatus, setPayStatus] = useState<PayStatus>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [receiptReference, setReceiptReference] = useState<string | null>(null);

  async function pay(childId: string, term: string) {
    if (!user || !childId) return;
    setPayStatus("starting");
    setMessage(null);
    setReceiptReference(null);

    try {
      const idToken = await user.getIdToken();
      const res = await fetch("/api/paystack/initialize", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({ childId, term }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not start payment");

      if (!window.PaystackPop) {
        throw new Error("Payment widget hasn't loaded yet — please try again in a moment.");
      }

      window.PaystackPop.resumeTransaction(data.accessCode, {
        onSuccess: async () => {
          setPayStatus("verifying");
          try {
            const verifyData = await verifyPayment(idToken, data.reference);
            if (verifyData.status === "success") {
              setPayStatus("success");
              setMessage("Payment confirmed — thank you!");
              setReceiptReference(data.reference);
            } else {
              setPayStatus("error");
              setMessage("We couldn't confirm this payment yet. Contact the school if you were charged.");
            }
          } catch {
            setPayStatus("error");
            setMessage("We couldn't confirm this payment yet. Contact the school if you were charged.");
          }
        },
        onCancel: () => setPayStatus("idle"),
      });
    } catch (err) {
      setPayStatus("error");
      setMessage(err instanceof Error ? err.message : "Something went wrong");
    }
  }

  return { payStatus, message, receiptReference, pay };
}
