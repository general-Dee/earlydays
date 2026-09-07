"use client";

import { useEffect, useState } from "react";
import type { User } from "firebase/auth";
import { useListFilter } from "@/lib/useListFilter";

type LoadState = "loading" | "forbidden" | "error" | "ready";

type RateLimitBucket = { key: string; count: number; resetAt: number };

function getSearchText(bucket: RateLimitBucket): string {
  return bucket.key;
}

export default function AdminRateLimitsList({ user }: { user: User }) {
  const [buckets, setBuckets] = useState<RateLimitBucket[]>([]);
  const [state, setState] = useState<LoadState>("loading");

  const { query, setQuery, page, setPage, filtered, paged, totalPages } = useListFilter(
    buckets,
    getSearchText
  );

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setState("loading");
      try {
        const idToken = await user.getIdToken();
        const res = await fetch("/api/admin/rate-limits", {
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

        const data = (await res.json()) as { buckets: RateLimitBucket[] };
        setBuckets(data.buckets);
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
      <div className="mb-1">
        <h4 className="font-display text-xl mb-0.5">Rate Limits</h4>
        <p className="text-[0.85rem] text-slate">
          Active throttle buckets keyed by route and IP or actor email. Most recent 500.
        </p>
      </div>

      {state === "loading" && <p className="text-sm text-slate mt-5">Loading rate-limit buckets…</p>}

      {state === "forbidden" && (
        <div className="mt-4 px-3.5 py-3 rounded-lg bg-sun-soft text-clay text-[0.85rem] font-semibold">
          You&rsquo;re logged in, but this account isn&rsquo;t authorized to view rate limits.
        </div>
      )}

      {state === "error" && (
        <div className="mt-4 px-3.5 py-3 rounded-lg bg-clay-soft text-clay text-[0.85rem] font-semibold">
          Couldn&rsquo;t load rate-limit buckets. Please try again.
        </div>
      )}

      {state === "ready" && buckets.length === 0 && (
        <p className="text-sm text-slate mt-5">No active rate-limit buckets.</p>
      )}

      {state === "ready" && buckets.length > 0 && (
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by bucket key…"
          aria-label="Search rate-limit buckets"
          className="mt-5 w-full text-sm rounded-md border border-slate/20 bg-chalk text-ink px-3 py-2"
        />
      )}

      {state === "ready" && buckets.length > 0 && filtered.length === 0 && (
        <p className="text-sm text-slate mt-4">No matching buckets.</p>
      )}

      {state === "ready" && paged.length > 0 && (
        <ul className="flex flex-col gap-2.5 mt-4">
          {paged.map((bucket) => (
            <li key={bucket.key} className="px-3.5 py-3 rounded-lg bg-chalk">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-semibold">{bucket.key}</span>
                <span className="text-xs text-slate">Resets {new Date(bucket.resetAt).toLocaleString("en-NG")}</span>
              </div>
              <p className="text-sm mt-1 mb-0 text-slate">{bucket.count} request{bucket.count === 1 ? "" : "s"}</p>
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
