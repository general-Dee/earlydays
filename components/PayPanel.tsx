"use client";

import { useEffect, useState } from "react";
import Script from "next/script";
import Link from "next/link";
import { doc, getDoc } from "firebase/firestore";
import { useAuth } from "@/lib/firebase/AuthProvider";
import { getFirebaseDb } from "@/lib/firebase/client";
import { COLLECTIONS } from "@/lib/firebase/collections";
import { TERMS } from "@/lib/data";
import { usePaystackFeePayment } from "@/lib/usePaystackFeePayment";
import type { Parent } from "@/lib/firebase/types";

type ParentStatus = "idle" | "loading" | "ready" | "missing";

export default function PayPanel() {
  const { user, loading: authLoading } = useAuth();
  const [parent, setParent] = useState<Parent | null>(null);
  const [parentStatus, setParentStatus] = useState<ParentStatus>("idle");
  const [childId, setChildId] = useState("");
  const [term, setTerm] = useState(TERMS[0]);
  const { payStatus, message, receiptReference, pay } = usePaystackFeePayment({ user });

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
        {receiptReference && (
          <Link href={`/portal/receipts/${receiptReference}`} className="text-sm font-medium underline text-accent-light mt-1 inline-block">
            View receipt →
          </Link>
        )}
      </div>

      <button onClick={() => pay(childId, term)} disabled={!canPay} className="btn btn-primary disabled:opacity-60">
        {payStatus === "starting" || payStatus === "verifying" ? "Processing…" : "Pay Fees Now →"}
      </button>
    </div>
  );
}
