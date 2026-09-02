"use client";

import { useEffect, useState } from "react";
import { signOut, type User } from "firebase/auth";
import { getFirebaseAuth } from "@/lib/firebase/client";
import type { Testimonial } from "@/lib/firebase/types";

type LoadState = "loading" | "forbidden" | "error" | "ready";

type EditForm = { quote: string; name: string; area: string; initial: string; order: string };

function blankEditForm(t: Testimonial): EditForm {
  return { quote: t.quote, name: t.name, area: t.area, initial: t.initial, order: String(t.order) };
}

export default function AdminTestimonialsList({ user }: { user: User }) {
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [state, setState] = useState<LoadState>("loading");

  const [quote, setQuote] = useState("");
  const [name, setName] = useState("");
  const [area, setArea] = useState("");
  const [initial, setInitial] = useState("");
  const [order, setOrder] = useState("0");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<EditForm | null>(null);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setState("loading");
      try {
        const idToken = await user.getIdToken();
        const res = await fetch("/api/admin/testimonials", {
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

        const data = (await res.json()) as { testimonials: Testimonial[] };
        setTestimonials(data.testimonials);
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

  async function createTestimonial(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setSubmitError(null);

    try {
      const idToken = await user.getIdToken();
      const res = await fetch("/api/admin/testimonials", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${idToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ quote, name, area, initial, order: Number(order) }),
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setSubmitError(data.error ?? "Couldn't save this testimonial. Please try again.");
        return;
      }

      const created = (await res.json()) as Testimonial;
      setTestimonials((current) => [...current, created].sort((a, b) => a.order - b.order));
      setQuote("");
      setName("");
      setArea("");
      setInitial("");
      setOrder("0");
    } catch {
      setSubmitError("Couldn't save this testimonial. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  function startEdit(t: Testimonial) {
    setEditingId(t.id);
    setEditForm(blankEditForm(t));
    setEditError(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditForm(null);
    setEditError(null);
  }

  async function saveEdit(id: string) {
    if (!editForm) return;
    setEditSubmitting(true);
    setEditError(null);

    try {
      const idToken = await user.getIdToken();
      const res = await fetch(`/api/admin/testimonials/${id}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${idToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          quote: editForm.quote,
          name: editForm.name,
          area: editForm.area,
          initial: editForm.initial,
          order: Number(editForm.order),
        }),
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setEditError(data.error ?? "Couldn't save these changes. Please try again.");
        return;
      }

      const updated = (await res.json()) as Testimonial;
      setTestimonials((current) => current.map((t) => (t.id === id ? updated : t)).sort((a, b) => a.order - b.order));
      setEditingId(null);
      setEditForm(null);
    } catch {
      setEditError("Couldn't save these changes. Please try again.");
    } finally {
      setEditSubmitting(false);
    }
  }

  async function deleteTestimonial(id: string) {
    const previous = testimonials;
    setDeletingId(id);
    setTestimonials((current) => current.filter((t) => t.id !== id));

    try {
      const idToken = await user.getIdToken();
      const res = await fetch(`/api/admin/testimonials/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${idToken}` },
      });

      if (!res.ok) {
        setTestimonials(previous);
      }
    } catch {
      setTestimonials(previous);
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="card p-8 md:p-9 shadow-[0_20px_50px_-30px_rgba(22,33,62,0.3)]">
      <div className="flex items-start justify-between gap-4 mb-1">
        <div>
          <h4 className="font-display text-xl mb-0.5">Testimonials</h4>
          <p className="text-[0.85rem] text-slate">{user.email}</p>
        </div>
        <button onClick={() => signOut(getFirebaseAuth())} className="btn btn-ghost btn-sm">
          Log Out
        </button>
      </div>

      <form onSubmit={createTestimonial} className="mt-5 flex flex-col gap-2.5">
        <textarea
          placeholder="Quote"
          value={quote}
          onChange={(e) => setQuote(e.target.value)}
          required
          rows={3}
          className="text-sm rounded-md border border-slate/20 bg-chalk text-ink px-3 py-2"
        />
        <input
          type="text"
          placeholder="Name (e.g. Aisha B.)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className="text-sm rounded-md border border-slate/20 bg-chalk text-ink px-3 py-2"
        />
        <input
          type="text"
          placeholder="Area (e.g. Parent, Barnawa)"
          value={area}
          onChange={(e) => setArea(e.target.value)}
          required
          className="text-sm rounded-md border border-slate/20 bg-chalk text-ink px-3 py-2"
        />
        <input
          type="text"
          placeholder="Avatar initial (e.g. A)"
          value={initial}
          onChange={(e) => setInitial(e.target.value)}
          required
          maxLength={2}
          className="text-sm rounded-md border border-slate/20 bg-chalk text-ink px-3 py-2 w-32"
        />
        <input
          type="number"
          placeholder="Display order"
          value={order}
          onChange={(e) => setOrder(e.target.value)}
          required
          className="text-sm rounded-md border border-slate/20 bg-chalk text-ink px-3 py-2 w-40"
        />

        {submitError && <p className="text-[0.8rem] text-clay mb-0">{submitError}</p>}
        <button type="submit" disabled={submitting} className="btn btn-primary btn-sm self-start">
          {submitting ? "Saving…" : "Add Testimonial"}
        </button>
      </form>

      {state === "loading" && <p className="text-sm text-slate mt-5">Loading testimonials…</p>}

      {state === "forbidden" && (
        <div className="mt-4 px-3.5 py-3 rounded-lg bg-sun-soft text-clay text-[0.85rem] font-semibold">
          You&rsquo;re logged in, but this account isn&rsquo;t authorized to manage testimonials.
        </div>
      )}

      {state === "error" && (
        <div className="mt-4 px-3.5 py-3 rounded-lg bg-clay-soft text-clay text-[0.85rem] font-semibold">
          Couldn&rsquo;t load testimonials. Please try again.
        </div>
      )}

      {state === "ready" && testimonials.length === 0 && (
        <p className="text-sm text-slate mt-5">No testimonials yet.</p>
      )}

      {state === "ready" && testimonials.length > 0 && (
        <ul className="flex flex-col gap-2.5 mt-4">
          {testimonials.map((t) => {
            const isEditing = editingId === t.id;

            return (
              <li key={t.id} className="px-3.5 py-3 rounded-lg bg-chalk">
                {isEditing && editForm ? (
                  <div className="flex flex-col gap-2">
                    <textarea
                      placeholder="Quote"
                      value={editForm.quote}
                      onChange={(e) => setEditForm((form) => (form ? { ...form, quote: e.target.value } : form))}
                      required
                      rows={3}
                      className="text-sm rounded-md border border-slate/20 bg-chalk text-ink px-3 py-2"
                    />
                    <input
                      type="text"
                      placeholder="Name"
                      value={editForm.name}
                      onChange={(e) => setEditForm((form) => (form ? { ...form, name: e.target.value } : form))}
                      required
                      className="text-sm rounded-md border border-slate/20 bg-chalk text-ink px-3 py-2"
                    />
                    <input
                      type="text"
                      placeholder="Area"
                      value={editForm.area}
                      onChange={(e) => setEditForm((form) => (form ? { ...form, area: e.target.value } : form))}
                      required
                      className="text-sm rounded-md border border-slate/20 bg-chalk text-ink px-3 py-2"
                    />
                    <input
                      type="text"
                      placeholder="Avatar initial"
                      value={editForm.initial}
                      onChange={(e) => setEditForm((form) => (form ? { ...form, initial: e.target.value } : form))}
                      required
                      maxLength={2}
                      className="text-sm rounded-md border border-slate/20 bg-chalk text-ink px-3 py-2 w-32"
                    />
                    <input
                      type="number"
                      placeholder="Display order"
                      value={editForm.order}
                      onChange={(e) => setEditForm((form) => (form ? { ...form, order: e.target.value } : form))}
                      required
                      className="text-sm rounded-md border border-slate/20 bg-chalk text-ink px-3 py-2 w-40"
                    />
                    {editError && <p className="text-[0.8rem] text-clay mb-0">{editError}</p>}
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => saveEdit(t.id)}
                        disabled={editSubmitting}
                        className="btn btn-primary btn-sm"
                      >
                        {editSubmitting ? "Saving…" : "Save"}
                      </button>
                      <button type="button" onClick={cancelEdit} className="btn btn-ghost btn-sm">
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm font-semibold">
                        {t.name} · {t.area}
                      </span>
                      <span className="text-xs text-slate">Order {t.order}</span>
                    </div>
                    <p className="text-sm mt-1 mb-0 text-slate">{t.quote}</p>
                    <div className="flex items-center gap-2 mt-2.5">
                      <button type="button" onClick={() => startEdit(t)} className="btn btn-ghost btn-sm">
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteTestimonial(t.id)}
                        disabled={deletingId === t.id}
                        className="btn btn-ghost btn-sm"
                      >
                        {deletingId === t.id ? "Deleting…" : "Delete"}
                      </button>
                    </div>
                  </>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
