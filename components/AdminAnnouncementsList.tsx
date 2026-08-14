"use client";

import { useEffect, useState } from "react";
import { signOut, type User } from "firebase/auth";
import { getFirebaseAuth } from "@/lib/firebase/client";
import type { Announcement } from "@/lib/firebase/types";

type LoadState = "loading" | "forbidden" | "error" | "ready";

export default function AdminAnnouncementsList({ user }: { user: User }) {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [state, setState] = useState<LoadState>("loading");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [posting, setPosting] = useState(false);
  const [postError, setPostError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function createAnnouncement(e: React.FormEvent) {
    e.preventDefault();
    setPosting(true);
    setPostError(null);

    try {
      const idToken = await user.getIdToken();
      const res = await fetch("/api/admin/announcements", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${idToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ title, body }),
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setPostError(data.error ?? "Couldn't post this announcement. Please try again.");
        return;
      }

      const created = (await res.json()) as Announcement;
      setAnnouncements((current) => [created, ...current]);
      setTitle("");
      setBody("");
    } catch {
      setPostError("Couldn't post this announcement. Please try again.");
    } finally {
      setPosting(false);
    }
  }

  async function deleteAnnouncement(id: string) {
    const previous = announcements;
    setDeletingId(id);
    setAnnouncements((current) => current.filter((a) => a.id !== id));

    try {
      const idToken = await user.getIdToken();
      const res = await fetch(`/api/admin/announcements/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${idToken}` },
      });

      if (!res.ok) {
        setAnnouncements(previous);
      }
    } catch {
      setAnnouncements(previous);
    } finally {
      setDeletingId(null);
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setState("loading");
      try {
        const idToken = await user.getIdToken();
        const res = await fetch("/api/admin/announcements", {
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

        const data = (await res.json()) as { announcements: Announcement[] };
        setAnnouncements(data.announcements);
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
          <h4 className="font-display text-xl mb-0.5">Announcements</h4>
          <p className="text-[0.85rem] text-slate">{user.email}</p>
        </div>
        <button onClick={() => signOut(getFirebaseAuth())} className="btn btn-ghost btn-sm">
          Log Out
        </button>
      </div>

      <form onSubmit={createAnnouncement} className="mt-5 flex flex-col gap-2.5">
        <input
          type="text"
          placeholder="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          className="text-sm rounded-md border border-slate/20 bg-white px-3 py-2"
        />
        <textarea
          placeholder="Announcement details"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          required
          rows={3}
          className="text-sm rounded-md border border-slate/20 bg-white px-3 py-2"
        />
        {postError && <p className="text-[0.8rem] text-clay mb-0">{postError}</p>}
        <button type="submit" disabled={posting} className="btn btn-primary btn-sm self-start">
          {posting ? "Posting…" : "Post Announcement"}
        </button>
      </form>

      {state === "loading" && <p className="text-sm text-slate mt-5">Loading announcements…</p>}

      {state === "forbidden" && (
        <div className="mt-4 px-3.5 py-3 rounded-lg bg-sun-soft text-clay text-[0.85rem] font-semibold">
          You&rsquo;re logged in, but this account isn&rsquo;t authorized to manage announcements.
        </div>
      )}

      {state === "error" && (
        <div className="mt-4 px-3.5 py-3 rounded-lg bg-clay-soft text-clay text-[0.85rem] font-semibold">
          Couldn&rsquo;t load announcements. Please try again.
        </div>
      )}

      {state === "ready" && announcements.length === 0 && (
        <p className="text-sm text-slate mt-5">No announcements yet.</p>
      )}

      {state === "ready" && announcements.length > 0 && (
        <ul className="flex flex-col gap-2.5 mt-5">
          {announcements.map((announcement) => (
            <li key={announcement.id} className="px-3.5 py-3 rounded-lg bg-chalk">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-semibold">{announcement.title}</span>
                <span className="text-xs text-slate">
                  {new Date(announcement.createdAt).toLocaleString("en-NG")}
                </span>
              </div>
              <p className="text-sm mt-2 mb-0">{announcement.body}</p>
              <div className="flex items-center justify-between gap-2.5 mt-2.5">
                <span className="text-xs text-slate">{announcement.createdBy}</span>
                <button
                  onClick={() => deleteAnnouncement(announcement.id)}
                  disabled={deletingId === announcement.id}
                  className="btn btn-ghost btn-sm"
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
