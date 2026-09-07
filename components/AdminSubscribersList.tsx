"use client";

import { useEffect, useState } from "react";
import { signOut, type User } from "firebase/auth";
import { getFirebaseAuth } from "@/lib/firebase/client";
import type { Subscriber } from "@/lib/firebase/types";
import { useListFilter } from "@/lib/useListFilter";
import { downloadCsv, toCsv } from "@/lib/csv";

type LoadState = "loading" | "forbidden" | "error" | "ready";

function getSearchText(subscriber: Subscriber): string {
  return [subscriber.email, subscriber.name].filter(Boolean).join(" ");
}

function subscribersToCsv(subscribers: Subscriber[]): string {
  return toCsv(
    ["Email", "Name", "Created At"],
    subscribers.map((s) => [s.email, s.name ?? "", new Date(s.createdAt).toISOString()])
  );
}

export default function AdminSubscribersList({ user }: { user: User }) {
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [state, setState] = useState<LoadState>("loading");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [emailsSent, setEmailsSent] = useState<number | null>(null);

  const { query, setQuery, page, setPage, filtered, paged, totalPages } = useListFilter(
    subscribers,
    getSearchText
  );

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setState("loading");
      try {
        const idToken = await user.getIdToken();
        const res = await fetch("/api/admin/subscribers", {
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

        const data = (await res.json()) as { subscribers: Subscriber[] };
        setSubscribers(data.subscribers);
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
    downloadCsv("subscribers", subscribersToCsv(filtered));
  }

  async function sendNewsletter(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    setSendError(null);
    setEmailsSent(null);

    try {
      const idToken = await user.getIdToken();
      const res = await fetch("/api/admin/subscribers", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${idToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ subject, body }),
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setSendError(data.error ?? "Couldn't send this newsletter. Please try again.");
        return;
      }

      const result = (await res.json()) as { emailsSent: number };
      setEmailsSent(result.emailsSent);
      setSubject("");
      setBody("");
    } catch {
      setSendError("Couldn't send this newsletter. Please try again.");
    } finally {
      setSending(false);
    }
  }

  async function deleteSubscriber(id: string) {
    const previous = subscribers;
    setDeletingId(id);
    setSubscribers((current) => current.filter((s) => s.id !== id));

    try {
      const idToken = await user.getIdToken();
      const res = await fetch(`/api/admin/subscribers/${encodeURIComponent(id)}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${idToken}` },
      });

      if (!res.ok) {
        setSubscribers(previous);
      }
    } catch {
      setSubscribers(previous);
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="card p-8 md:p-9 shadow-[0_20px_50px_-30px_rgba(22,33,62,0.3)]">
      <div className="flex items-start justify-between gap-4 mb-1">
        <div>
          <h4 className="font-display text-xl mb-0.5">Subscribers</h4>
          <p className="text-[0.85rem] text-slate">{user.email}</p>
        </div>
        <div className="flex items-center gap-2">
          {state === "ready" && filtered.length > 0 && (
            <button onClick={exportCsv} className="btn btn-ghost btn-sm">
              Export CSV
            </button>
          )}
          <button onClick={() => signOut(getFirebaseAuth())} className="btn btn-ghost btn-sm">
            Log Out
          </button>
        </div>
      </div>

      <form onSubmit={sendNewsletter} className="mt-5 flex flex-col gap-2.5">
        <input
          type="text"
          placeholder="Subject"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          required
          className="text-sm rounded-md border border-slate/20 bg-chalk text-ink px-3 py-2"
        />
        <textarea
          placeholder="Newsletter body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          required
          rows={4}
          className="text-sm rounded-md border border-slate/20 bg-chalk text-ink px-3 py-2"
        />
        {sendError && <p className="text-[0.8rem] text-clay mb-0">{sendError}</p>}
        <button type="submit" disabled={sending} className="btn btn-primary btn-sm self-start">
          {sending ? "Sending…" : "Send Newsletter"}
        </button>
      </form>

      {emailsSent !== null && (
        <div className="mt-4 px-3.5 py-3 rounded-lg bg-leaf-soft text-leaf text-[0.85rem] font-semibold">
          Newsletter sent — emailed {emailsSent} subscriber{emailsSent === 1 ? "" : "s"}.
        </div>
      )}

      {state === "loading" && <p className="text-sm text-slate mt-5">Loading subscribers…</p>}

      {state === "forbidden" && (
        <div className="mt-4 px-3.5 py-3 rounded-lg bg-sun-soft text-clay text-[0.85rem] font-semibold">
          You&rsquo;re logged in, but this account isn&rsquo;t authorized to view subscribers.
        </div>
      )}

      {state === "error" && (
        <div className="mt-4 px-3.5 py-3 rounded-lg bg-clay-soft text-clay text-[0.85rem] font-semibold">
          Couldn&rsquo;t load subscribers. Please try again.
        </div>
      )}

      {state === "ready" && subscribers.length === 0 && (
        <p className="text-sm text-slate mt-5">No newsletter subscribers yet.</p>
      )}

      {state === "ready" && subscribers.length > 0 && (
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name or email…"
          aria-label="Search subscribers"
          className="w-full mt-5 text-sm rounded-md border border-slate/20 bg-chalk text-ink px-3 py-2"
        />
      )}

      {state === "ready" && subscribers.length > 0 && filtered.length === 0 && (
        <p className="text-sm text-slate mt-4">No matching subscribers.</p>
      )}

      {state === "ready" && paged.length > 0 && (
        <ul className="flex flex-col gap-2.5 mt-4">
          {paged.map((subscriber) => (
            <li key={subscriber.id} className="px-3.5 py-3 rounded-lg bg-chalk flex items-center justify-between gap-3">
              <div>
                <span className="text-sm font-semibold">{subscriber.email}</span>
                {subscriber.name && <span className="text-xs text-slate ml-2">{subscriber.name}</span>}
                <div className="text-xs text-slate mt-0.5">
                  {new Date(subscriber.createdAt).toLocaleString("en-NG")}
                </div>
              </div>
              <button
                onClick={() => deleteSubscriber(subscriber.id)}
                disabled={deletingId === subscriber.id}
                className="btn btn-ghost btn-sm"
              >
                {deletingId === subscriber.id ? "Removing…" : "Remove"}
              </button>
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
