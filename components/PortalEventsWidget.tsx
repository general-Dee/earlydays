"use client";

import { useEffect, useState } from "react";
import { collection, getDocs, limit, orderBy, query, where } from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase/client";
import { COLLECTIONS } from "@/lib/firebase/collections";
import type { CalendarEvent } from "@/lib/firebase/types";

type LoadState = "loading" | "error" | "ready";

const UPCOMING_LIMIT = 5;

export default function PortalEventsWidget() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [state, setState] = useState<LoadState>("loading");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setState("loading");
      try {
        const today = new Date().toISOString().slice(0, 10);
        const snap = await getDocs(
          query(
            collection(getFirebaseDb(), COLLECTIONS.events),
            where("date", ">=", today),
            orderBy("date", "asc"),
            limit(UPCOMING_LIMIT)
          )
        );

        if (cancelled) return;

        setEvents(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as CalendarEvent));
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
      <h5 className="text-[0.78rem] font-medium text-slate uppercase tracking-wider mb-2.5">Upcoming</h5>

      {state === "loading" && <p className="text-sm text-slate">Loading upcoming events…</p>}

      {state === "error" && (
        <div className="px-3.5 py-3 rounded-lg bg-clay-soft text-clay text-[0.85rem] font-semibold">
          Couldn&rsquo;t load upcoming events. Please try again.
        </div>
      )}

      {state === "ready" && events.length === 0 && (
        <p className="text-sm text-slate">No upcoming events yet.</p>
      )}

      {state === "ready" && events.length > 0 && (
        <ul className="flex flex-col gap-2">
          {events.map((event) => (
            <li key={event.id} className="flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-lg bg-chalk">
              <div>
                <span className="block text-sm font-semibold">{event.title}</span>
                <span className="text-xs text-slate">{event.tag}</span>
              </div>
              <span className="text-xs text-slate whitespace-nowrap">
                {new Date(`${event.date}T00:00:00`).toLocaleDateString("en-NG", {
                  day: "numeric",
                  month: "short",
                })}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
