"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { User } from "firebase/auth";
import { useListFilter } from "@/lib/useListFilter";
import { downloadCsv, toCsv } from "@/lib/csv";
import type { NotificationFailure } from "@/lib/firebase/types";

type LoadState = "loading" | "forbidden" | "error" | "ready";

function getSearchText(failure: NotificationFailure): string {
  return [failure.job, failure.channel, failure.recipientLabel, failure.reason].join(" ");
}

function failuresToCsv(failures: NotificationFailure[]): string {
  return toCsv(
    ["Job", "Channel", "Recipient", "Reason", "Created At"],
    failures.map((f) => [
      f.job,
      f.channel,
      f.recipientLabel,
      f.reason,
      new Date(f.createdAt).toISOString(),
    ])
  );
}

export default function AdminNotificationFailuresList({ user }: { user: User }) {
  const [failures, setFailures] = useState<NotificationFailure[]>([]);
  const [state, setState] = useState<LoadState>("loading");

  const { query, setQuery, page, setPage, filtered, paged, totalPages } = useListFilter(
    failures,
    getSearchText
  );

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setState("loading");
      try {
        const idToken = await user.getIdToken();
        const res = await fetch("/api/admin/notification-failures", {
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

        const data = (await res.json()) as { failures: NotificationFailure[] };
        setFailures(data.failures);
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

  function exportCsv() {
    downloadCsv("notification-failures", failuresToCsv(filtered));
  }

  return (
    <div className="card p-8 md:p-9 shadow-[0_20px_50px_-30px_rgba(22,33,62,0.3)]">
      <div className="mb-1">
        <h4 className="font-display text-xl mb-0.5">Notification Failures</h4>
        <p className="text-[0.85rem] text-slate">
          Failed fee/event reminder sends — email, WhatsApp, SMS. Most recent 500.
        </p>
      </div>

      {state === "loading" && <p className="text-sm text-slate mt-5">Loading notification failures…</p>}

      {state === "forbidden" && (
        <div className="mt-4 px-3.5 py-3 rounded-lg bg-sun-soft text-clay text-[0.85rem] font-semibold">
          You&rsquo;re logged in, but this account isn&rsquo;t authorized to view notification failures.
        </div>
      )}

      {state === "error" && (
        <div className="mt-4 px-3.5 py-3 rounded-lg bg-clay-soft text-clay text-[0.85rem] font-semibold">
          Couldn&rsquo;t load notification failures. Please try again.
        </div>
      )}

      {state === "ready" && failures.length === 0 && (
        <p className="text-sm text-slate mt-5">No notification failures recorded yet.</p>
      )}

      {state === "ready" && failures.length > 0 && (
        <div className="mt-5 flex items-center gap-2.5">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by job, channel, recipient, or reason…"
            aria-label="Search notification failures"
            className="flex-1 text-sm rounded-md border border-slate/20 bg-chalk text-ink px-3 py-2"
          />
          {filtered.length > 0 && (
            <button onClick={exportCsv} className="btn btn-ghost btn-sm">
              Export CSV
            </button>
          )}
        </div>
      )}

      {state === "ready" && failures.length > 0 && filtered.length === 0 && (
        <p className="text-sm text-slate mt-4">No matching notification failures.</p>
      )}

      {state === "ready" && paged.length > 0 && (
        <ul className="flex flex-col gap-2.5 mt-4">
          {paged.map((failure) => (
            <li key={failure.id} className="px-3.5 py-3 rounded-lg bg-chalk">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-semibold">
                  {failure.job} · {failure.channel}
                </span>
                <span className="text-xs text-slate">{new Date(failure.createdAt).toLocaleString("en-NG")}</span>
              </div>
              <p className="text-sm mt-1 mb-0">{failure.recipientLabel}</p>
              <p className="text-xs mt-1 mb-0 px-2 py-1 inline-block rounded bg-clay-soft text-clay font-semibold">
                {failure.reason}
              </p>
              {failure.recipientUid && (
                <Link
                  href={`/admin/parents?q=${encodeURIComponent(failure.recipientLabel)}`}
                  className="btn btn-ghost btn-sm mt-2"
                >
                  View Parent
                </Link>
              )}
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
