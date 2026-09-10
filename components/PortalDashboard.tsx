"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { collection, doc, getDoc, getDocs, orderBy, query } from "firebase/firestore";
import { signOut, type User } from "firebase/auth";
import { getFirebaseAuth, getFirebaseDb } from "@/lib/firebase/client";
import { COLLECTIONS } from "@/lib/firebase/collections";
import { formatNaira } from "@/lib/currency";
import type { Parent, PaymentRecord } from "@/lib/firebase/types";
import AnnouncementsFeed from "@/components/AnnouncementsFeed";
import PortalEventsWidget from "@/components/PortalEventsWidget";
import PortalReportsWidget from "@/components/PortalReportsWidget";
import PortalProfileForm from "@/components/PortalProfileForm";
import PortalPayPanel from "@/components/PortalPayPanel";

const statusStyle: Record<PaymentRecord["status"], string> = {
  success: "bg-leaf-soft text-leaf",
  pending: "bg-sun-soft text-clay",
  failed: "bg-clay-soft text-clay",
};

type LoadState = "loading" | "error" | "notFound" | "ready";

export default function PortalDashboard({ user }: { user: User }) {
  const [parent, setParent] = useState<Parent | null>(null);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [state, setState] = useState<LoadState>("loading");
  const [paymentsError, setPaymentsError] = useState(false);

  const reloadPayments = useCallback(async () => {
    try {
      const paymentsSnap = await getDocs(
        query(
          collection(getFirebaseDb(), COLLECTIONS.parents, user.uid, COLLECTIONS.payments),
          orderBy("createdAt", "desc")
        )
      );
      setPayments(paymentsSnap.docs.map((d) => d.data() as PaymentRecord));
      setPaymentsError(false);
    } catch {
      setPaymentsError(true);
    }
  }, [user.uid]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setState("loading");
      try {
        const parentSnap = await getDoc(doc(getFirebaseDb(), COLLECTIONS.parents, user.uid));
        if (!parentSnap.exists()) {
          if (!cancelled) setState("notFound");
          return;
        }

        const paymentsSnap = await getDocs(
          query(
            collection(getFirebaseDb(), COLLECTIONS.parents, user.uid, COLLECTIONS.payments),
            orderBy("createdAt", "desc")
          )
        );

        if (cancelled) return;

        setParent(parentSnap.data() as Parent);
        setPayments(paymentsSnap.docs.map((d) => d.data() as PaymentRecord));
        setState("ready");
      } catch {
        if (!cancelled) setState("error");
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [user.uid]);

  return (
    <div className="card p-8 md:p-9">
      <div className="flex items-start justify-between gap-4 mb-1">
        <div>
          <h4 className="font-display font-medium text-xl mb-0.5 text-ink">Welcome back</h4>
          <p className="text-[0.85rem] text-slate">{user.email}</p>
        </div>
        <button onClick={() => signOut(getFirebaseAuth())} className="btn btn-ghost btn-sm">
          Log Out
        </button>
      </div>

      <AnnouncementsFeed />
      <PortalEventsWidget parent={parent} />

      {state === "loading" && <p className="text-sm text-slate mt-5">Loading your records…</p>}

      {state === "error" && (
        <div className="mt-4 px-3.5 py-3 rounded-lg bg-clay-soft text-clay text-[0.85rem] font-semibold">
          Couldn&rsquo;t load your records. Please try again.
        </div>
      )}

      {state === "notFound" && (
        <div className="mt-4 px-3.5 py-3 rounded-lg bg-sun-soft text-clay text-[0.85rem] font-semibold">
          We couldn&rsquo;t find a parent record for this account yet. Contact the school office to have your children linked to your portal login.
        </div>
      )}

      {state === "ready" && parent && (
        <>
          <PortalProfileForm
            uid={user.uid}
            parent={parent}
            onSaved={(patch) => setParent((p) => (p ? { ...p, ...patch } : p))}
          />

          <div className="mt-5">
            <h5 className="text-[0.78rem] font-medium text-slate uppercase tracking-wider mb-2.5">Children</h5>
            {parent.children.length === 0 ? (
              <p className="text-sm text-slate">No children linked to this account yet.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {parent.children.map((child) => (
                  <li key={child.id} className="flex items-center justify-between px-3.5 py-2.5 rounded-lg bg-chalk">
                    <span className="text-sm font-semibold">{child.name}</span>
                    <span className="text-xs text-slate">{child.stage}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <PortalReportsWidget uid={user.uid} />

          <PortalPayPanel user={user} parent={parent} onPaid={reloadPayments} />

          <div className="mt-6">
            <h5 className="text-[0.78rem] font-medium text-slate uppercase tracking-wider mb-2.5">Payment history</h5>
            {paymentsError && (
              <div className="mb-2.5 px-3.5 py-3 rounded-lg bg-clay-soft text-clay text-[0.85rem] font-semibold">
                Couldn&rsquo;t refresh your payment history. Please refresh the page.
              </div>
            )}
            {payments.length === 0 ? (
              <p className="text-sm text-slate">No payments yet.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {payments.map((payment) => (
                  <li key={payment.reference} className="flex items-center justify-between px-3.5 py-2.5 rounded-lg bg-chalk">
                    <div>
                      <span className="block text-sm font-semibold">{payment.childName} — {payment.term}</span>
                      <span className="text-xs text-slate">{formatNaira(payment.amountKobo)}</span>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <span className={`text-[0.7rem] font-bold px-2.5 py-1 rounded-full ${statusStyle[payment.status]}`}>
                        {payment.status}
                      </span>
                      {payment.status === "success" && (
                        <Link href={`/portal/receipts/${payment.reference}`} className="btn btn-ghost btn-sm">
                          View receipt
                        </Link>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
}
