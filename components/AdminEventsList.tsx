"use client";

import { useEffect, useState } from "react";
import { signOut, type User } from "firebase/auth";
import { getFirebaseAuth } from "@/lib/firebase/client";
import type { CalendarEvent, EventRsvp } from "@/lib/firebase/types";

type LoadState = "loading" | "forbidden" | "error" | "ready";
type RsvpLoadState = "loading" | "error" | "ready";

function EventRsvps({ user, eventId }: { user: User; eventId: string }) {
  const [rsvps, setRsvps] = useState<EventRsvp[]>([]);
  const [state, setState] = useState<RsvpLoadState>("loading");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setState("loading");
      try {
        const idToken = await user.getIdToken();
        const res = await fetch(`/api/admin/events/${eventId}/rsvps`, {
          headers: { Authorization: `Bearer ${idToken}` },
        });

        if (cancelled) return;

        if (!res.ok) {
          setState("error");
          return;
        }

        const data = (await res.json()) as { rsvps: EventRsvp[] };
        setRsvps(data.rsvps);
        setState("ready");
      } catch {
        if (!cancelled) setState("error");
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [user, eventId]);

  if (state === "loading") return <p className="text-xs text-slate mt-2">Loading RSVPs…</p>;
  if (state === "error") return <p className="text-xs text-clay mt-2">Couldn&rsquo;t load RSVPs.</p>;
  if (rsvps.length === 0) return <p className="text-xs text-slate mt-2">No RSVPs yet.</p>;

  const totalGuests = rsvps.reduce((sum, r) => sum + r.guestCount, 0);

  return (
    <div className="mt-2.5 border-t border-line pt-2.5">
      <p className="text-xs text-slate mb-1.5">
        {rsvps.length} {rsvps.length === 1 ? "RSVP" : "RSVPs"} · {totalGuests} {totalGuests === 1 ? "guest" : "guests"}
      </p>
      <ul className="flex flex-col gap-1">
        {rsvps.map((r) => (
          <li key={r.id} className="text-xs text-ink">
            {r.name} · {r.email}
            {r.phone ? ` · ${r.phone}` : ""} · {r.guestCount} {r.guestCount === 1 ? "guest" : "guests"}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function AdminEventsList({ user }: { user: User }) {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [state, setState] = useState<LoadState>("loading");
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [tag, setTag] = useState("");
  const [desc, setDesc] = useState("");
  const [posting, setPosting] = useState(false);
  const [postError, setPostError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [openRsvpsId, setOpenRsvpsId] = useState<string | null>(null);

  async function createEvent(e: React.FormEvent) {
    e.preventDefault();
    setPosting(true);
    setPostError(null);

    try {
      const idToken = await user.getIdToken();
      const res = await fetch("/api/admin/events", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${idToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ title, date, tag, desc }),
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setPostError(data.error ?? "Couldn't add this event. Please try again.");
        return;
      }

      const created = (await res.json()) as CalendarEvent;
      setEvents((current) => [...current, created].sort((a, b) => a.date.localeCompare(b.date)));
      setTitle("");
      setDate("");
      setTag("");
      setDesc("");
    } catch {
      setPostError("Couldn't add this event. Please try again.");
    } finally {
      setPosting(false);
    }
  }

  async function deleteEvent(id: string) {
    const previous = events;
    setDeletingId(id);
    setEvents((current) => current.filter((e) => e.id !== id));

    try {
      const idToken = await user.getIdToken();
      const res = await fetch(`/api/admin/events/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${idToken}` },
      });

      if (!res.ok) {
        setEvents(previous);
      }
    } catch {
      setEvents(previous);
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
        const res = await fetch("/api/admin/events", {
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

        const data = (await res.json()) as { events: CalendarEvent[] };
        setEvents(data.events);
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
          <h4 className="font-display text-xl mb-0.5">Events</h4>
          <p className="text-[0.85rem] text-slate">{user.email}</p>
        </div>
        <button onClick={() => signOut(getFirebaseAuth())} className="btn btn-ghost btn-sm">
          Log Out
        </button>
      </div>

      <form onSubmit={createEvent} className="mt-5 flex flex-col gap-2.5">
        <input
          type="text"
          placeholder="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          className="text-sm rounded-md border border-slate/20 bg-chalk text-ink px-3 py-2"
        />
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          required
          className="text-sm rounded-md border border-slate/20 bg-chalk text-ink px-3 py-2"
        />
        <input
          type="text"
          placeholder="Tag (e.g. All Stages, Nursery, Admissions)"
          value={tag}
          onChange={(e) => setTag(e.target.value)}
          required
          className="text-sm rounded-md border border-slate/20 bg-chalk text-ink px-3 py-2"
        />
        <textarea
          placeholder="Event details"
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
          required
          rows={3}
          className="text-sm rounded-md border border-slate/20 bg-chalk text-ink px-3 py-2"
        />
        {postError && <p className="text-[0.8rem] text-clay mb-0">{postError}</p>}
        <button type="submit" disabled={posting} className="btn btn-primary btn-sm self-start">
          {posting ? "Adding…" : "Add Event"}
        </button>
      </form>

      {state === "loading" && <p className="text-sm text-slate mt-5">Loading events…</p>}

      {state === "forbidden" && (
        <div className="mt-4 px-3.5 py-3 rounded-lg bg-sun-soft text-clay text-[0.85rem] font-semibold">
          You&rsquo;re logged in, but this account isn&rsquo;t authorized to manage events.
        </div>
      )}

      {state === "error" && (
        <div className="mt-4 px-3.5 py-3 rounded-lg bg-clay-soft text-clay text-[0.85rem] font-semibold">
          Couldn&rsquo;t load events. Please try again.
        </div>
      )}

      {state === "ready" && events.length === 0 && (
        <p className="text-sm text-slate mt-5">No events yet.</p>
      )}

      {state === "ready" && events.length > 0 && (
        <ul className="flex flex-col gap-2.5 mt-5">
          {events.map((event) => (
            <li key={event.id} className="px-3.5 py-3 rounded-lg bg-chalk">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-semibold">{event.title}</span>
                <span className="text-xs text-slate">
                  {new Date(`${event.date}T00:00:00`).toLocaleDateString("en-NG", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </span>
              </div>
              <p className="text-sm mt-2 mb-0">{event.desc}</p>
              <div className="flex items-center justify-between gap-2.5 mt-2.5">
                <span className="text-xs text-slate">{event.tag}</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setOpenRsvpsId(openRsvpsId === event.id ? null : event.id)}
                    className="btn btn-ghost btn-sm"
                  >
                    {openRsvpsId === event.id ? "Hide RSVPs" : "View RSVPs"}
                  </button>
                  <button
                    onClick={() => deleteEvent(event.id)}
                    disabled={deletingId === event.id}
                    className="btn btn-ghost btn-sm"
                  >
                    Delete
                  </button>
                </div>
              </div>
              {openRsvpsId === event.id && <EventRsvps user={user} eventId={event.id} />}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
