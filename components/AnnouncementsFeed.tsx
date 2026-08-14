"use client";

import { useEffect, useState } from "react";
import { collection, getDocs, orderBy, query } from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase/client";
import type { Announcement } from "@/lib/firebase/types";

type LoadState = "loading" | "error" | "ready";

export default function AnnouncementsFeed() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [state, setState] = useState<LoadState>("loading");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setState("loading");
      try {
        const snap = await getDocs(
          query(collection(getFirebaseDb(), "announcements"), orderBy("createdAt", "desc"))
        );

        if (cancelled) return;

        setAnnouncements(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Announcement));
        setState("ready");
      } catch {
        if (!cancelled) setState("error");
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="mt-6">
      <h5 className="text-[0.78rem] font-bold text-slate uppercase tracking-wider mb-2.5">Announcements</h5>

      {state === "loading" && <p className="text-sm text-slate">Loading announcements…</p>}

      {state === "error" && (
        <div className="px-3.5 py-3 rounded-lg bg-clay-soft text-clay text-[0.85rem] font-semibold">
          Couldn&rsquo;t load announcements. Please try again.
        </div>
      )}

      {state === "ready" && announcements.length === 0 && (
        <p className="text-sm text-slate">No announcements yet.</p>
      )}

      {state === "ready" && announcements.length > 0 && (
        <ul className="flex flex-col gap-2">
          {announcements.map((announcement) => (
            <li key={announcement.id} className="px-3.5 py-2.5 rounded-lg bg-chalk">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-semibold">{announcement.title}</span>
                <span className="text-xs text-slate">
                  {new Date(announcement.createdAt).toLocaleDateString("en-NG")}
                </span>
              </div>
              <p className="text-sm mt-1 mb-0">{announcement.body}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
