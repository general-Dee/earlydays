"use client";

import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import type { User } from "firebase/auth";
import { getFirebaseDb } from "@/lib/firebase/client";
import { COLLECTIONS } from "@/lib/firebase/collections";
import { site } from "@/lib/data";
import type { Parent, PaymentRecord } from "@/lib/firebase/types";

type LoadState = "loading" | "not-found" | "error" | "ready";

function formatNaira(amountKobo: number) {
  return `₦${(amountKobo / 100).toLocaleString("en-NG")}`;
}

export default function PortalReceiptView({ user, reference }: { user: User; reference: string }) {
  const [payment, setPayment] = useState<PaymentRecord | null>(null);
  const [guardianName, setGuardianName] = useState<string>("");
  const [state, setState] = useState<LoadState>("loading");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setState("loading");
      try {
        const paymentSnap = await getDoc(
          doc(getFirebaseDb(), COLLECTIONS.parents, user.uid, COLLECTIONS.payments, reference)
        );

        if (cancelled) return;

        if (!paymentSnap.exists() || (paymentSnap.data() as PaymentRecord).status !== "success") {
          setState("not-found");
          return;
        }

        const parentSnap = await getDoc(doc(getFirebaseDb(), COLLECTIONS.parents, user.uid));
        if (cancelled) return;

        setPayment(paymentSnap.data() as PaymentRecord);
        setGuardianName(parentSnap.exists() ? (parentSnap.data() as Parent).guardianName : "");
        setState("ready");
      } catch {
        if (!cancelled) setState("error");
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [user, reference]);

  return (
    <div className="card p-8 md:p-9 shadow-[0_20px_50px_-30px_rgba(22,33,62,0.3)]">
      <style>{`
        @media print {
          header, footer, a[aria-label="Chat on WhatsApp"] { display: none !important; }
        }
      `}</style>

      {state === "loading" && <p className="text-sm text-slate">Loading receipt…</p>}

      {state === "not-found" && (
        <div className="px-3.5 py-3 rounded-lg bg-sun-soft text-clay text-[0.85rem] font-semibold">
          We couldn&rsquo;t find a completed payment with this reference.
        </div>
      )}

      {state === "error" && (
        <div className="px-3.5 py-3 rounded-lg bg-clay-soft text-clay text-[0.85rem] font-semibold">
          Couldn&rsquo;t load this receipt. Please try again.
        </div>
      )}

      {state === "ready" && payment && (
        <>
          <div className="flex items-start justify-between gap-4 mb-5">
            <div>
              <h4 className="font-display text-xl mb-0.5">{site.fullName}</h4>
              <p className="text-[0.85rem] text-slate">{site.location}</p>
            </div>
            <button onClick={() => window.print()} className="btn btn-ghost btn-sm print:hidden">
              Print / Save as PDF
            </button>
          </div>

          <dl className="flex flex-col gap-2.5">
            <div className="flex items-center justify-between px-3.5 py-2.5 rounded-lg bg-chalk">
              <dt className="text-sm text-slate">Guardian</dt>
              <dd className="text-sm font-semibold">{guardianName || "—"}</dd>
            </div>
            <div className="flex items-center justify-between px-3.5 py-2.5 rounded-lg bg-chalk">
              <dt className="text-sm text-slate">Child</dt>
              <dd className="text-sm font-semibold">{payment.childName}</dd>
            </div>
            <div className="flex items-center justify-between px-3.5 py-2.5 rounded-lg bg-chalk">
              <dt className="text-sm text-slate">Term</dt>
              <dd className="text-sm font-semibold">{payment.term}</dd>
            </div>
            <div className="flex items-center justify-between px-3.5 py-2.5 rounded-lg bg-chalk">
              <dt className="text-sm text-slate">Amount paid</dt>
              <dd className="text-sm font-semibold">{formatNaira(payment.amountKobo)}</dd>
            </div>
            <div className="flex items-center justify-between px-3.5 py-2.5 rounded-lg bg-chalk">
              <dt className="text-sm text-slate">Reference</dt>
              <dd className="text-sm font-semibold">{payment.reference}</dd>
            </div>
            <div className="flex items-center justify-between px-3.5 py-2.5 rounded-lg bg-chalk">
              <dt className="text-sm text-slate">Paid on</dt>
              <dd className="text-sm font-semibold">
                {payment.paidAt ? new Date(payment.paidAt).toLocaleString("en-NG") : "—"}
              </dd>
            </div>
            {payment.channel && (
              <div className="flex items-center justify-between px-3.5 py-2.5 rounded-lg bg-chalk">
                <dt className="text-sm text-slate">Payment method</dt>
                <dd className="text-sm font-semibold">{payment.channel}</dd>
              </div>
            )}
          </dl>
        </>
      )}
    </div>
  );
}
