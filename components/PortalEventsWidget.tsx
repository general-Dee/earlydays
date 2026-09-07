"use client";

import { useEffect, useState } from "react";
import { collection, getDocs, limit, orderBy, query, where } from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase/client";
import { COLLECTIONS } from "@/lib/firebase/collections";
import type { CalendarEvent, Parent } from "@/lib/firebase/types";

type LoadState = "loading" | "error" | "ready";
type RsvpState = "idle" | "open" | "submitting" | "success";

const UPCOMING_LIMIT = 5;

export default function PortalEventsWidget({ parent }: { parent?: Parent | null }) {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [state, setState] = useState<LoadState>("loading");
  const [rsvpState, setRsvpState] = useState<Record<string, RsvpState>>({});
  const [guestCounts, setGuestCounts] = useState<Record<string, string>>({});
  const [rsvpErrors, setRsvpErrors] = useState<Record<string, string>>({});

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

  function openRsvp(eventId: string) {
    setRsvpState((s) => ({ ...s, [eventId]: "open" }));
    setGuestCounts((g) => ({ ...g, [eventId]: g[eventId] ?? "1" }));
  }

  async function submitRsvp(event: CalendarEvent) {
    if (!parent) return;
    setRsvpState((s) => ({ ...s, [event.id]: "submitting" }));
    setRsvpErrors((e) => {
      const next = { ...e };
      delete next[event.id];
      return next;
    });

    try {
      const res = await fetch(`/api/events/${event.id}/rsvp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: parent.guardianName,
          email: parent.email,
          phone: parent.phone,
          guestCount: Number(guestCounts[event.id] ?? "1"),
        }),
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setRsvpErrors((e) => ({ ...e, [event.id]: data.error ?? "Couldn't RSVP. Please try again." }));
        setRsvpState((s) => ({ ...s, [event.id]: "open" }));
        return;
      }

      setRsvpState((s) => ({ ...s, [event.id]: "success" }));
    } catch {
      setRsvpErrors((e) => ({ ...e, [event.id]: "Couldn't RSVP. Please try again." }));
      setRsvpState((s) => ({ ...s, [event.id]: "open" }));
    }
  }

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
          {events.map((event) => {
            const status = rsvpState[event.id] ?? "idle";
            return (
              <li key={event.id} className="flex flex-col gap-2 px-3.5 py-2.5 rounded-lg bg-chalk">
                <div className="flex items-center justify-between gap-3">
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
                </div>

                {parent && status === "idle" && (
                  <button
                    type="button"
                    onClick={() => openRsvp(event.id)}
                    className="btn btn-ghost btn-sm self-start"
                  >
                    RSVP
                  </button>
                )}

                {parent && (status === "open" || status === "submitting") && (
                  <div className="flex items-center gap-2">
                    <label className="flex items-center gap-1.5 text-xs text-slate">
                      Guests
                      <input
                        type="number"
                        min={1}
                        value={guestCounts[event.id] ?? "1"}
                        onChange={(e) => setGuestCounts((g) => ({ ...g, [event.id]: e.target.value }))}
                        className="w-14 text-xs rounded-md border border-slate/20 bg-paper text-ink px-2 py-1"
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() => submitRsvp(event)}
                      disabled={status === "submitting"}
                      className="btn btn-primary btn-sm"
                    >
                      {status === "submitting" ? "Sending…" : "Confirm RSVP"}
                    </button>
                  </div>
                )}

                {rsvpErrors[event.id] && <p className="text-[0.75rem] text-clay mb-0">{rsvpErrors[event.id]}</p>}

                {parent && status === "success" && (
                  <p className="text-[0.75rem] text-leaf font-semibold mb-0">
                    You&rsquo;re RSVP&rsquo;d for {guestCounts[event.id] ?? "1"} guest{guestCounts[event.id] === "1" ? "" : "s"}.
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
