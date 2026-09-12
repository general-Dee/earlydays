"use client";

import { useEffect, useState } from "react";
import type { User } from "firebase/auth";
import { useListFilter } from "@/lib/useListFilter";
import { downloadCsv, toCsv } from "@/lib/csv";
import type { CronRunRecord } from "@/lib/firebase/types";

type LoadState = "loading" | "forbidden" | "error" | "ready";

function getSearchText(run: CronRunRecord): string {
  return run.job;
}

function formatCounts(counts: Record<string, number>): string {
  return Object.entries(counts)
    .map(([key, value]) => `${key}: ${value}`)
    .join(", ");
}

function runsToCsv(runs: CronRunRecord[]): string {
  return toCsv(
    ["Job", "Counts", "Failures", "Created At"],
    runs.map((r) => [r.job, formatCounts(r.counts), String(r.failures), new Date(r.createdAt).toISOString()])
  );
}

export default function AdminCronRunsList({ user }: { user: User }) {
  const [runs, setRuns] = useState<CronRunRecord[]>([]);
  const [state, setState] = useState<LoadState>("loading");

  const { query, setQuery, page, setPage, filtered, paged, totalPages } = useListFilter(
    runs,
    getSearchText
  );

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setState("loading");
      try {
        const idToken = await user.getIdToken();
        const res = await fetch("/api/admin/cron-runs", {
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

        const data = (await res.json()) as { runs: CronRunRecord[] };
        setRuns(data.runs);
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
    downloadCsv("cron-runs", runsToCsv(filtered));
  }

  return (
    <div className="card p-8 md:p-9 shadow-[0_20px_50px_-30px_rgba(22,33,62,0.3)]">
      <div className="mb-1">
        <h4 className="font-display text-xl mb-0.5">Cron Runs</h4>
        <p className="text-[0.85rem] text-slate">
          Scheduled reminder job history — event and fee reminders. Most recent 500.
        </p>
      </div>

      {state === "loading" && <p className="text-sm text-slate mt-5">Loading cron run history…</p>}

      {state === "forbidden" && (
        <div className="mt-4 px-3.5 py-3 rounded-lg bg-sun-soft text-clay text-[0.85rem] font-semibold">
          You&rsquo;re logged in, but this account isn&rsquo;t authorized to view cron runs.
        </div>
      )}

      {state === "error" && (
        <div className="mt-4 px-3.5 py-3 rounded-lg bg-clay-soft text-clay text-[0.85rem] font-semibold">
          Couldn&rsquo;t load cron run history. Please try again.
        </div>
      )}

      {state === "ready" && runs.length === 0 && (
        <p className="text-sm text-slate mt-5">No cron runs recorded yet.</p>
      )}

      {state === "ready" && runs.length > 0 && (
        <div className="mt-5 flex items-center gap-2.5">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by job name…"
            aria-label="Search cron runs"
            className="flex-1 text-sm rounded-md border border-slate/20 bg-chalk text-ink px-3 py-2"
          />
          {filtered.length > 0 && (
            <button onClick={exportCsv} className="btn btn-ghost btn-sm">
              Export CSV
            </button>
          )}
        </div>
      )}

      {state === "ready" && runs.length > 0 && filtered.length === 0 && (
        <p className="text-sm text-slate mt-4">No matching cron runs.</p>
      )}

      {state === "ready" && paged.length > 0 && (
        <ul className="flex flex-col gap-2.5 mt-4">
          {paged.map((run) => (
            <li key={run.id} className="px-3.5 py-3 rounded-lg bg-chalk">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-semibold">{run.job}</span>
                <span className="text-xs text-slate">{new Date(run.createdAt).toLocaleString("en-NG")}</span>
              </div>
              <p className="text-sm mt-1 mb-0 text-slate">{formatCounts(run.counts)}</p>
              {run.failures > 0 && (
                <p className="text-xs mt-1 mb-0 px-2 py-1 inline-block rounded bg-clay-soft text-clay font-semibold">
                  {run.failures} failure{run.failures === 1 ? "" : "s"}
                </p>
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
