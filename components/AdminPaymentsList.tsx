"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { signOut, type User } from "firebase/auth";
import { getFirebaseAuth } from "@/lib/firebase/client";
import { TERMS } from "@/lib/data";
import type { PaymentRecord, PaymentStatus } from "@/lib/firebase/types";
import { useListFilter } from "@/lib/useListFilter";

type LoadState = "loading" | "forbidden" | "error" | "ready";

type AdminPaymentRow = PaymentRecord & {
  parentUid: string;
  guardianName: string;
  guardianEmail: string;
};

const STATUS_OPTIONS: PaymentStatus[] = ["pending", "success", "failed"];

const statusStyle: Record<PaymentStatus, string> = {
  pending: "bg-sun-soft text-clay",
  success: "bg-leaf-soft text-leaf",
  failed: "bg-clay-soft text-clay",
};

function formatNaira(amountKobo: number) {
  return `₦${(amountKobo / 100).toLocaleString("en-NG")}`;
}

function getSearchText(payment: AdminPaymentRow): string {
  return [payment.guardianName, payment.childName, payment.reference].filter(Boolean).join(" ");
}

export default function AdminPaymentsList({ user }: { user: User }) {
  const [payments, setPayments] = useState<AdminPaymentRow[]>([]);
  const [state, setState] = useState<LoadState>("loading");
  const [statusFilter, setStatusFilter] = useState<PaymentStatus | "all">("all");
  const [termFilter, setTermFilter] = useState<string>("all");

  const statusFiltered =
    statusFilter === "all" ? payments : payments.filter((payment) => payment.status === statusFilter);
  const termFiltered =
    termFilter === "all" ? statusFiltered : statusFiltered.filter((payment) => payment.term === termFilter);
  const { query, setQuery, page, setPage, filtered, paged, totalPages } = useListFilter(
    termFiltered,
    getSearchText
  );

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setState("loading");
      try {
        const idToken = await user.getIdToken();
        const res = await fetch("/api/admin/payments", {
          headers: { Authorization: `Bearer ${idToken}` },
        });

        if (cancelled) return;

        if (res.status === 403) {
          setState("forbidden");
          return;
        }
        if (!res.ok) {
          setState("error");
          return;
        }

        const data = (await res.json()) as { payments: AdminPaymentRow[] };
        setPayments(data.payments);
        setState("ready");
      } catch {
        if (!cancelled) setState("error");
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [user]);

  return (
    <div className="card p-8 md:p-9 shadow-[0_20px_50px_-30px_rgba(22,33,62,0.3)]">
      <div className="flex items-start justify-between gap-4 mb-1">
        <div>
          <h4 className="font-display text-xl mb-0.5">Payments</h4>
          <p className="text-[0.85rem] text-slate">{user.email}</p>
        </div>
        <button onClick={() => signOut(getFirebaseAuth())} className="btn btn-ghost btn-sm">
          Log Out
        </button>
      </div>

      {state === "loading" && <p className="text-sm text-slate mt-5">Loading payments…</p>}

      {state === "forbidden" && (
        <div className="mt-4 px-3.5 py-3 rounded-lg bg-sun-soft text-clay text-[0.85rem] font-semibold">
          You&rsquo;re logged in, but this account isn&rsquo;t authorized to view payments.
        </div>
      )}

      {state === "error" && (
        <div className="mt-4 px-3.5 py-3 rounded-lg bg-clay-soft text-clay text-[0.85rem] font-semibold">
          Couldn&rsquo;t load payments. Please try again.
        </div>
      )}

      {state === "ready" && payments.length === 0 && (
        <p className="text-sm text-slate mt-5">No payments yet.</p>
      )}

      {state === "ready" && payments.length > 0 && (
        <div className="flex flex-wrap gap-2.5 mt-5">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by guardian, child, or reference…"
            aria-label="Search payments"
            className="flex-1 min-w-[200px] text-sm rounded-md border border-slate/20 bg-chalk text-ink px-3 py-2"
          />
          <select
            aria-label="Filter by status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as PaymentStatus | "all")}
            className="text-sm rounded-md border border-slate/20 bg-chalk text-ink px-3 py-2"
          >
            <option value="all">All statuses</option>
            {STATUS_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          <select
            aria-label="Filter by term"
            value={termFilter}
            onChange={(e) => setTermFilter(e.target.value)}
            className="text-sm rounded-md border border-slate/20 bg-chalk text-ink px-3 py-2"
          >
            <option value="all">All terms</option>
            {TERMS.map((term) => (
              <option key={term} value={term}>
                {term}
              </option>
            ))}
          </select>
        </div>
      )}

      {state === "ready" && payments.length > 0 && filtered.length === 0 && (
        <p className="text-sm text-slate mt-4">No matching payments.</p>
      )}

      {state === "ready" && paged.length > 0 && (
        <ul className="flex flex-col gap-2.5 mt-4">
          {paged.map((payment) => (
            <li key={`${payment.parentUid}/${payment.reference}`} className="px-3.5 py-3 rounded-lg bg-chalk">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-semibold">
                  {payment.guardianName} · {payment.childName}
                </span>
                <span className="text-xs text-slate">{new Date(payment.createdAt).toLocaleString("en-NG")}</span>
              </div>
              <div className="text-xs text-slate mt-0.5">
                {payment.term} · {formatNaira(payment.amountKobo)}
                {payment.channel ? ` · ${payment.channel}` : ""}
              </div>
              <div className="flex items-center gap-2.5 mt-2.5">
                <span className={`text-[0.7rem] font-bold px-2.5 py-1 rounded-full ${statusStyle[payment.status]}`}>
                  {payment.status}
                </span>
                <span className="text-xs text-slate">{payment.reference}</span>
                {payment.status === "success" && (
                  <Link
                    href={`/admin/payments/${payment.reference}?uid=${payment.parentUid}`}
                    className="btn btn-ghost btn-sm ml-auto"
                  >
                    View Receipt
                  </Link>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {state === "ready" && totalPages > 1 && (
        <div className="flex items-center gap-2.5 mt-4">
          <button
            type="button"
            onClick={() => setPage(page - 1)}
            disabled={page <= 1}
            className="btn btn-ghost btn-sm disabled:opacity-40"
          >
            ‹ Prev
          </button>
          <span className="text-xs text-slate">
            Page {page} of {totalPages}
          </span>
          <button
            type="button"
            onClick={() => setPage(page + 1)}
            disabled={page >= totalPages}
            className="btn btn-ghost btn-sm disabled:opacity-40"
          >
            Next ›
          </button>
        </div>
      )}
    </div>
  );
}
