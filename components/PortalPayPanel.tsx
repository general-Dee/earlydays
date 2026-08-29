"use client";

import { useEffect, useState } from "react";
import Script from "next/script";
import Link from "next/link";
import type { User } from "firebase/auth";
import { TERMS } from "@/lib/data";
import { usePaystackFeePayment } from "@/lib/usePaystackFeePayment";
import type { Parent } from "@/lib/firebase/types";

export default function PortalPayPanel({
  user,
  parent,
  onPaid,
}: {
  user: User;
  parent: Pick<Parent, "children">;
  onPaid: () => void;
}) {
  const [childId, setChildId] = useState(parent.children[0]?.id ?? "");
  const [term, setTerm] = useState(TERMS[0]);
  const { payStatus, message, receiptReference, pay } = usePaystackFeePayment({ user });

  useEffect(() => {
    if (payStatus === "success") onPaid();
  }, [payStatus, onPaid]);

  if (parent.children.length === 0) {
    return null;
  }

  const canPay = childId && payStatus !== "starting" && payStatus !== "verifying";

  return (
    <div className="mt-5">
      <Script src="https://js.paystack.co/v1/inline.js" strategy="afterInteractive" />
      <h5 className="text-[0.78rem] font-medium text-slate uppercase tracking-wider mb-2.5">Pay fees</h5>

      <div className="flex flex-wrap items-center gap-2.5">
        <select
          value={childId}
          onChange={(e) => setChildId(e.target.value)}
          className="text-sm rounded-md border border-slate/20 bg-chalk text-ink px-3 py-2"
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
          className="text-sm rounded-md border border-slate/20 bg-chalk text-ink px-3 py-2"
        >
          {TERMS.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <button onClick={() => pay(childId, term)} disabled={!canPay} className="btn btn-primary btn-sm disabled:opacity-60">
          {payStatus === "starting" || payStatus === "verifying" ? "Processing…" : "Pay Fees Now"}
        </button>
      </div>

      {message && <p className="text-sm text-slate mt-2">{message}</p>}
      {receiptReference && (
        <Link href={`/portal/receipts/${receiptReference}`} className="text-sm font-medium text-accent-light mt-1 inline-block">
          View receipt →
        </Link>
      )}
    </div>
  );
}
