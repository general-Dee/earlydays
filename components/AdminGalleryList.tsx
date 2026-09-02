"use client";

import { useEffect, useRef, useState } from "react";
import { signOut, type User } from "firebase/auth";
import { getFirebaseAuth } from "@/lib/firebase/client";
import type { GalleryPhoto } from "@/lib/firebase/types";

type LoadState = "loading" | "forbidden" | "error" | "ready";

const CATEGORIES = ["Campus & Grounds", "Classrooms", "Play & Discovery"] as const;

type EditForm = { alt: string; category: GalleryPhoto["category"]; tall: boolean; order: string };

function blankEditForm(photo: GalleryPhoto): EditForm {
  return { alt: photo.alt, category: photo.category, tall: Boolean(photo.tall), order: String(photo.order) };
}

export default function AdminGalleryList({ user }: { user: User }) {
  const [photos, setPhotos] = useState<GalleryPhoto[]>([]);
  const [state, setState] = useState<LoadState>("loading");

  const [alt, setAlt] = useState("");
  const [category, setCategory] = useState<GalleryPhoto["category"]>(CATEGORIES[0]);
  const [tall, setTall] = useState(false);
  const [order, setOrder] = useState("0");
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<EditForm | null>(null);
  const editPhotoInputRef = useRef<HTMLInputElement>(null);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setState("loading");
      try {
        const idToken = await user.getIdToken();
        const res = await fetch("/api/admin/gallery", {
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

        const data = (await res.json()) as { photos: GalleryPhoto[] };
        setPhotos(data.photos);
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

  async function createPhoto(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setSubmitError(null);

    try {
      const idToken = await user.getIdToken();
      const form = new FormData();
      form.set("alt", alt);
      form.set("category", category);
      form.set("tall", String(tall));
      form.set("order", order);
      const photo = photoInputRef.current?.files?.[0];
      if (photo) form.set("photo", photo);

      const res = await fetch("/api/admin/gallery", {
        method: "POST",
        headers: { Authorization: `Bearer ${idToken}` },
        body: form,
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setSubmitError(data.error ?? "Couldn't save this photo. Please try again.");
        return;
      }

      const created = (await res.json()) as GalleryPhoto;
      setPhotos((current) => [...current, created].sort((a, b) => a.order - b.order));
      setAlt("");
      setCategory(CATEGORIES[0]);
      setTall(false);
      setOrder("0");
      if (photoInputRef.current) photoInputRef.current.value = "";
    } catch {
      setSubmitError("Couldn't save this photo. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  function startEdit(photo: GalleryPhoto) {
    setEditingId(photo.id);
    setEditForm(blankEditForm(photo));
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
      const form = new FormData();
      form.set("alt", editForm.alt);
      form.set("category", editForm.category);
      form.set("tall", String(editForm.tall));
      form.set("order", editForm.order);
      const photo = editPhotoInputRef.current?.files?.[0];
      if (photo) form.set("photo", photo);

      const res = await fetch(`/api/admin/gallery/${id}`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${idToken}` },
        body: form,
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setEditError(data.error ?? "Couldn't save these changes. Please try again.");
        return;
      }

      const updated = (await res.json()) as GalleryPhoto;
      setPhotos((current) => current.map((p) => (p.id === id ? updated : p)).sort((a, b) => a.order - b.order));
      setEditingId(null);
      setEditForm(null);
    } catch {
      setEditError("Couldn't save these changes. Please try again.");
    } finally {
      setEditSubmitting(false);
    }
  }

  async function deletePhoto(id: string) {
    const previous = photos;
    setDeletingId(id);
    setPhotos((current) => current.filter((p) => p.id !== id));

    try {
      const idToken = await user.getIdToken();
      const res = await fetch(`/api/admin/gallery/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${idToken}` },
      });

      if (!res.ok) {
        setPhotos(previous);
      }
    } catch {
      setPhotos(previous);
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="card p-8 md:p-9 shadow-[0_20px_50px_-30px_rgba(22,33,62,0.3)]">
      <div className="flex items-start justify-between gap-4 mb-1">
        <div>
          <h4 className="font-display text-xl mb-0.5">Gallery Photos</h4>
          <p className="text-[0.85rem] text-slate">{user.email}</p>
        </div>
        <button onClick={() => signOut(getFirebaseAuth())} className="btn btn-ghost btn-sm">
          Log Out
        </button>
      </div>

      <form onSubmit={createPhoto} className="mt-5 flex flex-col gap-2.5">
        <input
          type="text"
          placeholder="Alt text (describe the photo)"
          value={alt}
          onChange={(e) => setAlt(e.target.value)}
          required
          className="text-sm rounded-md border border-slate/20 bg-chalk text-ink px-3 py-2"
        />
        <select
          aria-label="Category"
          value={category}
          onChange={(e) => setCategory(e.target.value as GalleryPhoto["category"])}
          className="text-sm rounded-md border border-slate/20 bg-chalk text-ink px-3 py-2"
        >
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-2 text-sm text-ink">
          <input type="checkbox" checked={tall} onChange={(e) => setTall(e.target.checked)} />
          Tall layout
        </label>
        <input
          type="number"
          placeholder="Display order"
          value={order}
          onChange={(e) => setOrder(e.target.value)}
          required
          className="text-sm rounded-md border border-slate/20 bg-chalk text-ink px-3 py-2 w-40"
        />
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          ref={photoInputRef}
          className="text-sm rounded-md border border-slate/20 bg-chalk text-ink px-3 py-2"
        />

        {submitError && <p className="text-[0.8rem] text-clay mb-0">{submitError}</p>}
        <button type="submit" disabled={submitting} className="btn btn-primary btn-sm self-start">
          {submitting ? "Saving…" : "Add Photo"}
        </button>
      </form>

      {state === "loading" && <p className="text-sm text-slate mt-5">Loading photos…</p>}

      {state === "forbidden" && (
        <div className="mt-4 px-3.5 py-3 rounded-lg bg-sun-soft text-clay text-[0.85rem] font-semibold">
          You&rsquo;re logged in, but this account isn&rsquo;t authorized to manage gallery photos.
        </div>
      )}

      {state === "error" && (
        <div className="mt-4 px-3.5 py-3 rounded-lg bg-clay-soft text-clay text-[0.85rem] font-semibold">
          Couldn&rsquo;t load photos. Please try again.
        </div>
      )}

      {state === "ready" && photos.length === 0 && (
        <p className="text-sm text-slate mt-5">No gallery photos yet.</p>
      )}

      {state === "ready" && photos.length > 0 && (
        <ul className="flex flex-col gap-2.5 mt-4">
          {photos.map((photo) => {
            const isEditing = editingId === photo.id;

            return (
              <li key={photo.id} className="px-3.5 py-3 rounded-lg bg-chalk">
                {isEditing && editForm ? (
                  <div className="flex flex-col gap-2">
                    <input
                      type="text"
                      placeholder="Alt text"
                      value={editForm.alt}
                      onChange={(e) => setEditForm((form) => (form ? { ...form, alt: e.target.value } : form))}
                      required
                      className="text-sm rounded-md border border-slate/20 bg-chalk text-ink px-3 py-2"
                    />
                    <select
                      aria-label="Category"
                      value={editForm.category}
                      onChange={(e) =>
                        setEditForm((form) => (form ? { ...form, category: e.target.value as GalleryPhoto["category"] } : form))
                      }
                      className="text-sm rounded-md border border-slate/20 bg-chalk text-ink px-3 py-2"
                    >
                      {CATEGORIES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                    <label className="flex items-center gap-2 text-sm text-ink">
                      <input
                        type="checkbox"
                        checked={editForm.tall}
                        onChange={(e) => setEditForm((form) => (form ? { ...form, tall: e.target.checked } : form))}
                      />
                      Tall layout
                    </label>
                    <input
                      type="number"
                      placeholder="Display order"
                      value={editForm.order}
                      onChange={(e) => setEditForm((form) => (form ? { ...form, order: e.target.value } : form))}
                      required
                      className="text-sm rounded-md border border-slate/20 bg-chalk text-ink px-3 py-2 w-40"
                    />
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      ref={editPhotoInputRef}
                      className="text-sm rounded-md border border-slate/20 bg-chalk text-ink px-3 py-2"
                    />
                    {editError && <p className="text-[0.8rem] text-clay mb-0">{editError}</p>}
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => saveEdit(photo.id)}
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
                      <span className="text-sm font-semibold">{photo.category}</span>
                      <span className="text-xs text-slate">Order {photo.order}</span>
                    </div>
                    <p className="text-sm mt-1 mb-0 text-slate">{photo.alt}</p>
                    <p className="text-xs mt-1.5 mb-0 text-slate">
                      {photo.tall ? "Tall layout" : "Standard layout"}
                    </p>
                    <div className="flex items-center gap-2 mt-2.5">
                      <button type="button" onClick={() => startEdit(photo)} className="btn btn-ghost btn-sm">
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => deletePhoto(photo.id)}
                        disabled={deletingId === photo.id}
                        className="btn btn-ghost btn-sm"
                      >
                        {deletingId === photo.id ? "Deleting…" : "Delete"}
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
