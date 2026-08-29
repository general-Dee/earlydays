"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { signOut, type User } from "firebase/auth";
import { getFirebaseAuth } from "@/lib/firebase/client";
import { TERMS } from "@/lib/data";
import { FEE_BRACKETS } from "@/lib/fees";
import type { ApplicationStatus } from "@/lib/firebase/types";

type LoadState = "loading" | "forbidden" | "error" | "ready";

type DashboardData = {
  term: string;
  applicationCounts: Record<ApplicationStatus, number>;
  newInquiries: number;
  fees: {
    childrenPaid: number;
    childrenUnpaid: number;
    amountCollectedKobo: number;
    amountExpectedKobo: number;
  };
  feeAmounts: Record<string, number>;
};

const STATUS_OPTIONS: ApplicationStatus[] = ["new", "reviewing", "accepted", "waitlisted", "declined"];

const statusStyle: Record<ApplicationStatus, string> = {
  new: "bg-sun-soft text-clay",
  reviewing: "bg-ground-card text-accent-light",
  accepted: "bg-leaf-soft text-leaf",
  waitlisted: "bg-chalk text-slate",
  declined: "bg-clay-soft text-clay",
};

const QUICK_LINKS = [
  { href: "/admin/applications", label: "Applications" },
  { href: "/admin/parents", label: "Parents" },
  { href: "/admin/inquiries", label: "Inquiries" },
  { href: "/admin/reports", label: "Reports" },
  { href: "/admin/announcements", label: "Announcements" },
  { href: "/admin/events", label: "Events" },
];

function formatNaira(amountKobo: number) {
  return `₦${(amountKobo / 100).toLocaleString("en-NG")}`;
}

export default function AdminDashboardOverview({ user }: { user: User }) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [state, setState] = useState<LoadState>("loading");
  const [editingTerm, setEditingTerm] = useState(false);
  const [termDraft, setTermDraft] = useState(TERMS[0]);
  const [savingTerm, setSavingTerm] = useState(false);
  const [termError, setTermError] = useState<string | null>(null);

  const [editingFees, setEditingFees] = useState(false);
  const [feesDraft, setFeesDraft] = useState<Record<string, string>>({});
  const [savingFees, setSavingFees] = useState(false);
  const [feesError, setFeesError] = useState<string | null>(null);

  async function saveFees() {
    setSavingFees(true);
    setFeesError(null);

    const feesKobo: Record<string, number> = {};
    for (const bracket of FEE_BRACKETS) {
      const naira = Number(feesDraft[bracket.id]);
      if (!Number.isFinite(naira) || naira <= 0) {
        setFeesError(`Enter a valid amount for ${bracket.label}`);
        setSavingFees(false);
        return;
      }
      feesKobo[bracket.id] = Math.round(naira * 100);
    }

    try {
      const idToken = await user.getIdToken();
      const res = await fetch("/api/admin/dashboard", {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${idToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ feesKobo }),
      });

      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        setFeesError(body.error ?? "Couldn't update the fee schedule. Please try again.");
        return;
      }

      setData((current) => (current ? { ...current, feeAmounts: feesKobo } : current));
      setEditingFees(false);
    } catch {
      setFeesError("Couldn't update the fee schedule. Please try again.");
    } finally {
      setSavingFees(false);
    }
  }

  async function saveTerm() {
    setSavingTerm(true);
    setTermError(null);

    try {
      const idToken = await user.getIdToken();
      const res = await fetch("/api/admin/dashboard", {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${idToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ currentTerm: termDraft }),
      });

      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        setTermError(body.error ?? "Couldn't update the term. Please try again.");
        return;
      }

      setData((current) => (current ? { ...current, term: termDraft } : current));
      setEditingTerm(false);
    } catch {
      setTermError("Couldn't update the term. Please try again.");
    } finally {
      setSavingTerm(false);
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setState("loading");
      try {
        const idToken = await user.getIdToken();
        const res = await fetch("/api/admin/dashboard", {
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

        const json = (await res.json()) as DashboardData;
        setData(json);
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
          <h4 className="font-display text-xl mb-0.5">Overview</h4>
          <p className="text-[0.85rem] text-slate">{user.email}</p>
        </div>
        <button onClick={() => signOut(getFirebaseAuth())} className="btn btn-ghost btn-sm">
          Log Out
        </button>
      </div>

      {state === "loading" && <p className="text-sm text-slate mt-5">Loading overview…</p>}

      {state === "forbidden" && (
        <div className="mt-4 px-3.5 py-3 rounded-lg bg-sun-soft text-clay text-[0.85rem] font-semibold">
          You&rsquo;re logged in, but this account isn&rsquo;t authorized to view the dashboard.
        </div>
      )}

      {state === "error" && (
        <div className="mt-4 px-3.5 py-3 rounded-lg bg-clay-soft text-clay text-[0.85rem] font-semibold">
          Couldn&rsquo;t load the dashboard. Please try again.
        </div>
      )}

      {state === "ready" && data && (
        <>
          <div className="mt-5">
            <h5 className="text-[0.78rem] font-medium text-slate uppercase tracking-wider mb-2.5">
              Applications
            </h5>
            <div className="flex flex-wrap gap-2.5">
              {STATUS_OPTIONS.map((status) => (
                <div key={status} className="px-3.5 py-2.5 rounded-lg bg-chalk min-w-[7rem]">
                  <span className={`text-[0.7rem] font-bold px-2.5 py-1 rounded-full ${statusStyle[status]}`}>
                    {status}
                  </span>
                  <div className="text-2xl font-display font-semibold mt-1.5">
                    {data.applicationCounts[status]}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6">
            <div className="flex items-center gap-2.5 mb-2.5">
              <h5 className="text-[0.78rem] font-medium text-slate uppercase tracking-wider">
                Fee collection — {data.term}
              </h5>
              {!editingTerm && (
                <button
                  type="button"
                  aria-label="Change term"
                  onClick={() => {
                    setTermDraft(data.term);
                    setEditingTerm(true);
                  }}
                  className="btn btn-ghost btn-sm"
                >
                  Change
                </button>
              )}
            </div>

            {editingTerm && (
              <div className="flex items-center gap-2 mb-2.5">
                <select
                  aria-label="Current term"
                  value={termDraft}
                  onChange={(e) => setTermDraft(e.target.value)}
                  className="text-sm rounded-md border border-slate/20 bg-chalk text-ink px-3 py-2"
                >
                  {TERMS.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={saveTerm}
                  disabled={savingTerm}
                  className="btn btn-primary btn-sm"
                >
                  {savingTerm ? "Saving…" : "Save"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditingTerm(false);
                    setTermError(null);
                  }}
                  className="btn btn-ghost btn-sm"
                >
                  Cancel
                </button>
              </div>
            )}

            {termError && <p className="text-[0.8rem] text-clay mb-2.5">{termError}</p>}

            <div className="flex items-center gap-2.5 mb-2.5">
              <span className="text-[0.7rem] font-semibold text-slate uppercase tracking-wider">Fee schedule</span>
              {!editingFees && (
                <button
                  type="button"
                  aria-label="Change fee schedule"
                  onClick={() => {
                    setFeesDraft(
                      Object.fromEntries(
                        FEE_BRACKETS.map((bracket) => [
                          bracket.id,
                          String((data.feeAmounts[bracket.id] ?? bracket.defaultAmountKobo) / 100),
                        ])
                      )
                    );
                    setEditingFees(true);
                  }}
                  className="btn btn-ghost btn-sm"
                >
                  Change
                </button>
              )}
            </div>

            {editingFees && (
              <div className="flex flex-col gap-2 mb-2.5">
                {FEE_BRACKETS.map((bracket) => (
                  <div key={bracket.id} className="flex items-center gap-2">
                    <label htmlFor={`fee-${bracket.id}`} className="text-xs text-slate w-32">
                      {bracket.label}
                    </label>
                    <input
                      id={`fee-${bracket.id}`}
                      type="number"
                      min={1}
                      value={feesDraft[bracket.id] ?? ""}
                      onChange={(e) => setFeesDraft((current) => ({ ...current, [bracket.id]: e.target.value }))}
                      className="text-sm rounded-md border border-slate/20 bg-chalk text-ink px-3 py-2 w-32"
                    />
                  </div>
                ))}
                <div className="flex items-center gap-2">
                  <button type="button" onClick={saveFees} disabled={savingFees} className="btn btn-primary btn-sm">
                    {savingFees ? "Saving…" : "Save"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingFees(false);
                      setFeesError(null);
                    }}
                    className="btn btn-ghost btn-sm"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {feesError && <p className="text-[0.8rem] text-clay mb-2.5">{feesError}</p>}

            {!editingFees && (
              <div className="flex flex-wrap gap-2.5 mb-2.5">
                {FEE_BRACKETS.map((bracket) => (
                  <div key={bracket.id} className="px-3.5 py-2.5 rounded-lg bg-chalk min-w-[8rem]">
                    <span className="text-[0.7rem] font-bold px-2.5 py-1 rounded-full bg-ground-card text-accent-light">
                      {bracket.label}
                    </span>
                    <div className="text-lg font-display font-semibold mt-1.5">
                      {formatNaira(data.feeAmounts[bracket.id] ?? bracket.defaultAmountKobo)}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex flex-wrap gap-2.5">
              <div className="px-3.5 py-2.5 rounded-lg bg-chalk min-w-[9rem]">
                <span className="text-[0.7rem] font-bold px-2.5 py-1 rounded-full bg-leaf-soft text-leaf">
                  paid
                </span>
                <div className="text-2xl font-display font-semibold mt-1.5">{data.fees.childrenPaid}</div>
              </div>
              <div className="px-3.5 py-2.5 rounded-lg bg-chalk min-w-[9rem]">
                <span className="text-[0.7rem] font-bold px-2.5 py-1 rounded-full bg-sun-soft text-clay">
                  unpaid
                </span>
                <div className="text-2xl font-display font-semibold mt-1.5">{data.fees.childrenUnpaid}</div>
              </div>
              <div className="px-3.5 py-2.5 rounded-lg bg-chalk min-w-[11rem]">
                <span className="text-[0.7rem] font-bold px-2.5 py-1 rounded-full bg-ground-card text-accent-light">
                  collected / expected
                </span>
                <div className="text-2xl font-display font-semibold mt-1.5">
                  {formatNaira(data.fees.amountCollectedKobo)}{" "}
                  <span className="text-sm text-slate font-normal">
                    / {formatNaira(data.fees.amountExpectedKobo)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6">
            <h5 className="text-[0.78rem] font-medium text-slate uppercase tracking-wider mb-2.5">Inquiries</h5>
            <div className="px-3.5 py-2.5 rounded-lg bg-chalk min-w-[9rem] inline-block">
              <span className="text-[0.7rem] font-bold px-2.5 py-1 rounded-full bg-sun-soft text-clay">
                new
              </span>
              <div className="text-2xl font-display font-semibold mt-1.5">{data.newInquiries}</div>
            </div>
          </div>

          <div className="mt-6">
            <h5 className="text-[0.78rem] font-medium text-slate uppercase tracking-wider mb-2.5">
              Go to
            </h5>
            <nav className="flex flex-wrap gap-2">
              {QUICK_LINKS.map((link) => (
                <Link key={link.href} href={link.href} className="btn btn-ghost btn-sm">
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>
        </>
      )}
    </div>
  );
}
