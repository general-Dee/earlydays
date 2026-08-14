"use client";

import { useEffect, useState } from "react";
import { collection, doc, getDoc, getDocs, orderBy, query } from "firebase/firestore";
import { signOut, type User } from "firebase/auth";
import { getFirebaseAuth, getFirebaseDb } from "@/lib/firebase/client";
import type { Parent, PaymentRecord } from "@/lib/firebase/types";
import AnnouncementsFeed from "@/components/AnnouncementsFeed";

function formatNaira(amountKobo: number) {
  return `₦${(amountKobo / 100).toLocaleString("en-NG")}`;
}

const statusStyle: Record<PaymentRecord["status"], string> = {
  success: "bg-leaf-soft text-leaf",
  pending: "bg-sun-soft text-clay",
  failed: "bg-clay-soft text-clay",
};

export default function PortalDashboard({ user }: { user: User }) {
  const [parent, setParent] = useState<Parent | null>(null);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const parentSnap = await getDoc(doc(getFirebaseDb(), "parents", user.uid));
        if (!parentSnap.exists()) {
          if (!cancelled) setNotFound(true);
          return;
        }

        const paymentsSnap = await getDocs(
          query(collection(getFirebaseDb(), "parents", user.uid, "payments"), orderBy("createdAt", "desc"))
        );

        if (!cancelled) {
          setParent(parentSnap.data() as Parent);
          setPayments(paymentsSnap.docs.map((d) => d.data() as PaymentRecord));
        }
      } catch {
        if (!cancelled) setNotFound(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [user.uid]);

  return (
    <div className="card p-8 md:p-9 shadow-[0_20px_50px_-30px_rgba(22,33,62,0.3)]">
      <div className="flex items-start justify-between gap-4 mb-1">
        <div>
          <h4 className="font-display text-xl mb-0.5">Welcome back</h4>
          <p className="text-[0.85rem] text-slate">{user.email}</p>
        </div>
        <button onClick={() => signOut(getFirebaseAuth())} className="btn btn-ghost btn-sm">
          Log Out
        </button>
      </div>

      <AnnouncementsFeed />

      {loading && <p className="text-sm text-slate mt-5">Loading your records…</p>}

      {!loading && notFound && (
        <div className="mt-4 px-3.5 py-3 rounded-lg bg-sun-soft text-clay text-[0.85rem] font-semibold">
          We couldn&rsquo;t find a parent record for this account yet. Contact the school office to have your children linked to your portal login.
        </div>
      )}

      {!loading && parent && (
        <>
          <div className="mt-5">
            <h5 className="text-[0.78rem] font-bold text-slate uppercase tracking-wider mb-2.5">Children</h5>
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

          <div className="mt-6">
            <h5 className="text-[0.78rem] font-bold text-slate uppercase tracking-wider mb-2.5">Payment history</h5>
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
                    <span className={`text-[0.7rem] font-bold px-2.5 py-1 rounded-full ${statusStyle[payment.status]}`}>
                      {payment.status}
                    </span>
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
