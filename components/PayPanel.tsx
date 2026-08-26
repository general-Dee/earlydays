"use client";

import { useEffect, useState } from "react";
import Script from "next/script";
import Link from "next/link";
import { doc, getDoc } from "firebase/firestore";
import { useAuth } from "@/lib/firebase/AuthProvider";
import { getFirebaseDb } from "@/lib/firebase/client";
import { COLLECTIONS } from "@/lib/firebase/collections";
import type { Parent } from "@/lib/firebase/types";

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

const TERMS = ["Term 1", "Term 2", "Term 3"];
const VERIFY_RETRY_DELAYS_MS = [1000, 2000];

type ParentStatus = "idle" | "loading" | "ready" | "missing";
type PayStatus = "idle" | "starting" | "verifying" | "success" | "error";

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

export default function PayPanel() {
  const { user, loading: authLoading } = useAuth();
  const [parent, setParent] = useState<Parent | null>(null);
  const [parentStatus, setParentStatus] = useState<ParentStatus>("idle");
  const [childId, setChildId] = useState("");
  const [term, setTerm] = useState(TERMS[0]);
  const [payStatus, setPayStatus] = useState<PayStatus>("idle");
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setParent(null);
      setParentStatus("idle");
      return;
    }

    setParentStatus("loading");
    getDoc(doc(getFirebaseDb(), COLLECTIONS.parents, user.uid))
      .then((snap) => {
        if (!snap.exists()) {
          setParentStatus("missing");
          return;
        }
        const data = snap.data() as Parent;
        setParent(data);
        setChildId(data.children[0]?.id ?? "");
        setParentStatus("ready");
      })
      .catch(() => setParentStatus("missing"));
  }, [user]);

  async function handlePay() {
    if (!user || !childId) return;
    setPayStatus("starting");
    setMessage(null);

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

  const canPay = user && parentStatus === "ready" && childId && payStatus !== "starting" && payStatus !== "verifying";

  return (
    <div
      className="rounded-card p-8 md:p-11 grid grid-cols-1 md:grid-cols-[1fr_auto] items-center gap-7 text-ink"
      style={{
        background: "radial-gradient(900px 420px at 85% -40%, rgba(53,59,128,0.7), transparent 64%), #262a60",
      }}
    >
      <Script src="https://js.paystack.co/v1/inline.js" strategy="afterInteractive" />
      <div>
        <span className="font-mono text-[0.7rem] bg-sun/[0.16] text-accent-light px-3 py-1.5 rounded-full inline-block mb-3.5">
          Secure Payment
        </span>
        <h3 className="font-display font-medium text-ink text-2xl mb-1.5">
          Pay school fees online, from anywhere
        </h3>
        <p className="text-ink/[0.78] mb-3.5">
          No more bank branch visits or lost receipts — pay termly fees directly and get an instant confirmation.
        </p>

        {!authLoading && !user && (
          <Link href="/portal" className="text-sm font-medium underline text-accent-light">
            Log in to pay fees →
          </Link>
        )}

        {user && parentStatus === "missing" && (
          <p className="text-sm text-ink/[0.78]">
            We couldn&rsquo;t find a parent record for this account. Contact the school office to have your children linked.
          </p>
        )}

        {user && parentStatus === "ready" && parent && parent.children.length === 0 && (
          <p className="text-sm text-ink/[0.78]">No children linked to your account yet — contact the school office.</p>
        )}

        {user && parentStatus === "ready" && parent && parent.children.length > 0 && (
          <div className="flex flex-wrap gap-3 mt-2">
            <select
              value={childId}
              onChange={(e) => setChildId(e.target.value)}
              className="px-3 py-2 rounded-lg bg-chalk border border-line text-ink text-sm"
            >
              {parent.children.map((child) => (
                <option key={child.id} value={child.id}>
                  {child.name} ({child.stage})
                </option>
              ))}
            </select>
            <select
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              className="px-3 py-2 rounded-lg bg-chalk border border-line text-ink text-sm"
            >
              {TERMS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
        )}

        {message && <p className="text-sm text-ink/[0.78] mt-3">{message}</p>}
      </div>

      <button onClick={handlePay} disabled={!canPay} className="btn btn-primary disabled:opacity-60">
        {payStatus === "starting" || payStatus === "verifying" ? "Processing…" : "Pay Fees Now →"}
      </button>
    </div>
  );
}
