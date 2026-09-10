"use client";

import { useEffect, useState } from "react";
import { signOut, type User } from "firebase/auth";
import { getFirebaseAuth } from "@/lib/firebase/client";
import type { Faq } from "@/lib/firebase/types";
import { useListFilter } from "@/lib/useListFilter";
import { downloadCsv, toCsv } from "@/lib/csv";

type LoadState = "loading" | "forbidden" | "error" | "ready";

type EditForm = { question: string; answer: string; order: string };

function blankEditForm(f: Faq): EditForm {
  return { question: f.question, answer: f.answer, order: String(f.order) };
}

function getSearchText(faq: Faq): string {
  return [faq.question, faq.answer].filter(Boolean).join(" ");
}

function faqsToCsv(faqs: Faq[]): string {
  return toCsv(
    ["Question", "Answer", "Order", "Created By", "Created At"],
    faqs.map((f) => [f.question, f.answer, String(f.order), f.createdBy, new Date(f.createdAt).toISOString()])
  );
}

export default function AdminFaqsList({ user }: { user: User }) {
  const [faqs, setFaqs] = useState<Faq[]>([]);
  const [state, setState] = useState<LoadState>("loading");

  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [order, setOrder] = useState("0");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<EditForm | null>(null);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { query, setQuery, page, setPage, filtered, paged, totalPages } = useListFilter(faqs, getSearchText);

  function exportCsv() {
    downloadCsv("faqs", faqsToCsv(filtered));
  }

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setState("loading");
      try {
        const idToken = await user.getIdToken();
        const res = await fetch("/api/admin/faqs", {
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

        const data = (await res.json()) as { faqs: Faq[] };
        setFaqs(data.faqs);
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

  async function createFaq(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setSubmitError(null);

    try {
      const idToken = await user.getIdToken();
      const res = await fetch("/api/admin/faqs", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${idToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ question, answer, order: Number(order) }),
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setSubmitError(data.error ?? "Couldn't save this FAQ. Please try again.");
        return;
      }

      const created = (await res.json()) as Faq;
      setFaqs((current) => [...current, created].sort((a, b) => a.order - b.order));
      setQuestion("");
      setAnswer("");
      setOrder("0");
    } catch {
      setSubmitError("Couldn't save this FAQ. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  function startEdit(f: Faq) {
    setEditingId(f.id);
    setEditForm(blankEditForm(f));
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
      const res = await fetch(`/api/admin/faqs/${id}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${idToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          question: editForm.question,
          answer: editForm.answer,
          order: Number(editForm.order),
        }),
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setEditError(data.error ?? "Couldn't save these changes. Please try again.");
        return;
      }

      const updated = (await res.json()) as Faq;
      setFaqs((current) => current.map((f) => (f.id === id ? updated : f)).sort((a, b) => a.order - b.order));
      setEditingId(null);
      setEditForm(null);
    } catch {
      setEditError("Couldn't save these changes. Please try again.");
    } finally {
      setEditSubmitting(false);
    }
  }

  async function deleteFaq(id: string) {
    const previous = faqs;
    setDeletingId(id);
    setFaqs((current) => current.filter((f) => f.id !== id));

    try {
      const idToken = await user.getIdToken();
      const res = await fetch(`/api/admin/faqs/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${idToken}` },
      });

      if (!res.ok) {
        setFaqs(previous);
      }
    } catch {
      setFaqs(previous);
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="card p-8 md:p-9 shadow-[0_20px_50px_-30px_rgba(22,33,62,0.3)]">
      <div className="flex items-start justify-between gap-4 mb-1">
        <div>
          <h4 className="font-display text-xl mb-0.5">FAQs</h4>
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

      <form onSubmit={createFaq} className="mt-5 flex flex-col gap-2.5">
        <input
          type="text"
          placeholder="Question"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          required
          className="text-sm rounded-md border border-slate/20 bg-chalk text-ink px-3 py-2"
        />
        <textarea
          placeholder="Answer"
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          required
          rows={3}
          className="text-sm rounded-md border border-slate/20 bg-chalk text-ink px-3 py-2"
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
          {submitting ? "Saving…" : "Add FAQ"}
        </button>
      </form>

      {state === "loading" && <p className="text-sm text-slate mt-5">Loading FAQs…</p>}

      {state === "forbidden" && (
        <div className="mt-4 px-3.5 py-3 rounded-lg bg-sun-soft text-clay text-[0.85rem] font-semibold">
          You&rsquo;re logged in, but this account isn&rsquo;t authorized to manage FAQs.
        </div>
      )}

      {state === "error" && (
        <div className="mt-4 px-3.5 py-3 rounded-lg bg-clay-soft text-clay text-[0.85rem] font-semibold">
          Couldn&rsquo;t load FAQs. Please try again.
        </div>
      )}

      {state === "ready" && faqs.length === 0 && <p className="text-sm text-slate mt-5">No FAQs yet.</p>}

      {state === "ready" && faqs.length > 0 && (
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search FAQs…"
          aria-label="Search FAQs"
          className="w-full mt-5 text-sm rounded-md border border-slate/20 bg-chalk text-ink px-3 py-2"
        />
      )}

      {state === "ready" && faqs.length > 0 && filtered.length === 0 && (
        <p className="text-sm text-slate mt-4">No matching FAQs.</p>
      )}

      {state === "ready" && paged.length > 0 && (
        <ul className="flex flex-col gap-2.5 mt-4">
          {paged.map((f) => {
            const isEditing = editingId === f.id;

            return (
              <li key={f.id} className="px-3.5 py-3 rounded-lg bg-chalk">
                {isEditing && editForm ? (
                  <div className="flex flex-col gap-2">
                    <input
                      type="text"
                      placeholder="Question"
                      value={editForm.question}
                      onChange={(e) => setEditForm((form) => (form ? { ...form, question: e.target.value } : form))}
                      required
                      className="text-sm rounded-md border border-slate/20 bg-chalk text-ink px-3 py-2"
                    />
                    <textarea
                      placeholder="Answer"
                      value={editForm.answer}
                      onChange={(e) => setEditForm((form) => (form ? { ...form, answer: e.target.value } : form))}
                      required
                      rows={3}
                      className="text-sm rounded-md border border-slate/20 bg-chalk text-ink px-3 py-2"
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
                        onClick={() => saveEdit(f.id)}
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
                      <span className="text-sm font-semibold">{f.question}</span>
                      <span className="text-xs text-slate">Order {f.order}</span>
                    </div>
                    <p className="text-sm mt-1 mb-0 text-slate">{f.answer}</p>
                    <div className="flex items-center gap-2 mt-2.5">
                      <button type="button" onClick={() => startEdit(f)} className="btn btn-ghost btn-sm">
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteFaq(f.id)}
                        disabled={deletingId === f.id}
                        className="btn btn-ghost btn-sm"
                      >
                        {deletingId === f.id ? "Deleting…" : "Delete"}
                      </button>
                    </div>
                  </>
                )}
              </li>
            );
          })}
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
