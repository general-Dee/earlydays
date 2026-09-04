"use client";

import { useEffect, useState } from "react";
import { collection, getDocs, orderBy, query } from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase/client";
import { COLLECTIONS } from "@/lib/firebase/collections";
import type { CalendarEvent } from "@/lib/firebase/types";

type LoadState = "loading" | "error" | "ready";
type RsvpStatus = "idle" | "submitting" | "success" | "error";

function formatBadge(date: string) {
  const parsed = new Date(`${date}T00:00:00`);
  return {
    day: parsed.toLocaleDateString("en-NG", { day: "2-digit" }),
    month: parsed.toLocaleDateString("en-NG", { month: "short" }).toUpperCase(),
  };
}

function RsvpForm({ eventId, onDone }: { eventId: string; onDone: () => void }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [guestCount, setGuestCount] = useState("1");
  const [hp, setHp] = useState("");
  const [status, setStatus] = useState<RsvpStatus>("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("submitting");
    setError(null);

    try {
      const res = await fetch(`/api/events/${eventId}/rsvp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, phone, guestCount: Number(guestCount), hp }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong — please try again.");
      setStatus("success");
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Something went wrong — please try again.");
    }
  }

  if (status === "success") {
    return (
      <div className="mt-3.5 px-3.5 py-3 rounded-lg bg-leaf-soft text-leaf text-[0.85rem] font-semibold">
        Thanks — we&rsquo;ve got your RSVP.
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-3.5 flex flex-col gap-2 border-t border-line pt-3.5">
      <input
        type="text"
        placeholder="Your name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
        className="text-sm rounded-md border border-line bg-chalk text-ink px-3 py-2"
      />
      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        className="text-sm rounded-md border border-line bg-chalk text-ink px-3 py-2"
      />
      <input
        type="tel"
        placeholder="Phone (optional)"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        className="text-sm rounded-md border border-line bg-chalk text-ink px-3 py-2"
      />
      <label className="flex items-center gap-2 text-sm text-slate">
        Guests
        <input
          type="number"
          min={1}
          value={guestCount}
          onChange={(e) => setGuestCount(e.target.value)}
          className="text-sm rounded-md border border-line bg-chalk text-ink px-3 py-2 w-20"
        />
      </label>

      <input
        type="text"
        name="company"
        value={hp}
        onChange={(e) => setHp(e.target.value)}
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="absolute -left-[9999px] w-px h-px overflow-hidden"
      />

      {error && <p className="text-[0.8rem] text-clay mb-0">{error}</p>}

      <div className="flex items-center gap-2">
        <button type="submit" disabled={status === "submitting"} className="btn btn-primary btn-sm">
          {status === "submitting" ? "Sending…" : "Confirm RSVP"}
        </button>
        <button type="button" onClick={onDone} className="btn btn-ghost btn-sm">
          Cancel
        </button>
      </div>
    </form>
  );
}

export default function EventsList() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [state, setState] = useState<LoadState>("loading");
  const [openRsvpId, setOpenRsvpId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setState("loading");
      try {
        const snap = await getDocs(query(collection(getFirebaseDb(), COLLECTIONS.events), orderBy("date", "asc")));

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
        const isRsvpOpen = openRsvpId === e.id;
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

                {!isRsvpOpen && (
                  <button
                    type="button"
                    onClick={() => setOpenRsvpId(e.id)}
                    className="btn btn-ghost btn-sm mt-3"
                  >
                    RSVP
                  </button>
                )}

                {isRsvpOpen && <RsvpForm eventId={e.id} onDone={() => setOpenRsvpId(null)} />}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
