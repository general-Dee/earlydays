"use client";

import { useEffect, useState } from "react";
import { collection, getDocs, orderBy, query } from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase/client";
import type { CalendarEvent } from "@/lib/firebase/types";

type LoadState = "loading" | "error" | "ready";

function formatBadge(date: string) {
  const parsed = new Date(`${date}T00:00:00`);
  return {
    day: parsed.toLocaleDateString("en-NG", { day: "2-digit" }),
    month: parsed.toLocaleDateString("en-NG", { month: "short" }).toUpperCase(),
  };
}

export default function EventsList() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [state, setState] = useState<LoadState>("loading");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setState("loading");
      try {
        const snap = await getDocs(query(collection(getFirebaseDb(), "events"), orderBy("date", "asc")));

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

  if (state === "loading") {
    return <p className="text-sm text-slate">Loading events…</p>;
  }

  if (state === "error") {
    return (
      <div className="px-3.5 py-3 rounded-lg bg-clay-soft text-clay text-[0.85rem] font-semibold">
        Couldn&rsquo;t load events. Please try again.
      </div>
    );
  }

  if (events.length === 0) {
    return <p className="text-sm text-slate">No upcoming events yet — check back soon.</p>;
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
      {events.map((e) => {
        const { day, month } = formatBadge(e.date);
        return (
          <div key={e.id} className="bg-ground-card border border-line rounded-card overflow-hidden p-5">
            <div className="flex items-start gap-4">
              <div className="bg-sun-soft text-tint-text rounded-lg text-center px-3 py-1.5 flex-shrink-0">
                <b className="block font-display text-xl leading-none font-medium">{day}</b>
                <span className="text-[0.62rem] uppercase text-accent-light">{month}</span>
              </div>
              <div className="flex-1">
                <div className="flex items-start justify-between gap-3 mb-1">
                  <h4 className="text-base text-ink font-medium">{e.title}</h4>
                  <span className="text-xs font-medium px-3 py-1.5 rounded-md bg-paper text-ink/[0.85] whitespace-nowrap">
                    {e.tag}
                  </span>
                </div>
                <p className="mb-0 text-sm text-ink/[0.78]">{e.desc}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
