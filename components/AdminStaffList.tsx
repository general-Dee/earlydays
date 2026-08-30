"use client";

import { useEffect, useRef, useState } from "react";
import { signOut, type User } from "firebase/auth";
import { getFirebaseAuth } from "@/lib/firebase/client";
import type { Staff } from "@/lib/firebase/types";

type LoadState = "loading" | "forbidden" | "error" | "ready";

type EditForm = { name: string; role: string; bio: string; order: string };

function blankEditForm(staff: Staff): EditForm {
  return { name: staff.name, role: staff.role, bio: staff.bio, order: String(staff.order) };
}

export default function AdminStaffList({ user }: { user: User }) {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [state, setState] = useState<LoadState>("loading");

  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [bio, setBio] = useState("");
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
        const res = await fetch("/api/admin/staff", {
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

        const data = (await res.json()) as { staff: Staff[] };
        setStaff(data.staff);
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

  async function createStaff(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setSubmitError(null);

    try {
      const idToken = await user.getIdToken();
      const form = new FormData();
      form.set("name", name);
      form.set("role", role);
      form.set("bio", bio);
      form.set("order", order);
      const photo = photoInputRef.current?.files?.[0];
      if (photo) form.set("photo", photo);

      const res = await fetch("/api/admin/staff", {
        method: "POST",
        headers: { Authorization: `Bearer ${idToken}` },
        body: form,
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setSubmitError(data.error ?? "Couldn't save this staff member. Please try again.");
        return;
      }

      const created = (await res.json()) as Staff;
      setStaff((current) => [...current, created].sort((a, b) => a.order - b.order));
      setName("");
      setRole("");
      setBio("");
      setOrder("0");
      if (photoInputRef.current) photoInputRef.current.value = "";
    } catch {
      setSubmitError("Couldn't save this staff member. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  function startEdit(member: Staff) {
    setEditingId(member.id);
    setEditForm(blankEditForm(member));
    setEditError(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditForm(null);
    setEditError(null);
  }

  async function saveEdit(id: string, removePhoto: boolean) {
    if (!editForm) return;
    setEditSubmitting(true);
    setEditError(null);

    try {
      const idToken = await user.getIdToken();
      const form = new FormData();
      form.set("name", editForm.name);
      form.set("role", editForm.role);
      form.set("bio", editForm.bio);
      form.set("order", editForm.order);
      const photo = editPhotoInputRef.current?.files?.[0];
      if (photo) form.set("photo", photo);
      if (removePhoto) form.set("removePhoto", "true");

      const res = await fetch(`/api/admin/staff/${id}`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${idToken}` },
        body: form,
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setEditError(data.error ?? "Couldn't save these changes. Please try again.");
        return;
      }

      const updated = (await res.json()) as Staff;
      setStaff((current) => current.map((m) => (m.id === id ? updated : m)).sort((a, b) => a.order - b.order));
      setEditingId(null);
      setEditForm(null);
    } catch {
      setEditError("Couldn't save these changes. Please try again.");
    } finally {
      setEditSubmitting(false);
    }
  }

  async function deleteStaff(id: string) {
    const previous = staff;
    setDeletingId(id);
    setStaff((current) => current.filter((m) => m.id !== id));

    try {
      const idToken = await user.getIdToken();
      const res = await fetch(`/api/admin/staff/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${idToken}` },
      });

      if (!res.ok) {
        setStaff(previous);
      }
    } catch {
      setStaff(previous);
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="card p-8 md:p-9 shadow-[0_20px_50px_-30px_rgba(22,33,62,0.3)]">
      <div className="flex items-start justify-between gap-4 mb-1">
        <div>
          <h4 className="font-display text-xl mb-0.5">Staff Profiles</h4>
          <p className="text-[0.85rem] text-slate">{user.email}</p>
        </div>
        <button onClick={() => signOut(getFirebaseAuth())} className="btn btn-ghost btn-sm">
          Log Out
        </button>
      </div>

      <form onSubmit={createStaff} className="mt-5 flex flex-col gap-2.5">
        <input
          type="text"
          placeholder="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className="text-sm rounded-md border border-slate/20 bg-chalk text-ink px-3 py-2"
        />
        <input
          type="text"
          placeholder="Role"
          value={role}
          onChange={(e) => setRole(e.target.value)}
          required
          className="text-sm rounded-md border border-slate/20 bg-chalk text-ink px-3 py-2"
        />
        <textarea
          placeholder="Bio"
          value={bio}
          onChange={(e) => setBio(e.target.value)}
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
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          ref={photoInputRef}
          className="text-sm rounded-md border border-slate/20 bg-chalk text-ink px-3 py-2"
        />

        {submitError && <p className="text-[0.8rem] text-clay mb-0">{submitError}</p>}
        <button type="submit" disabled={submitting} className="btn btn-primary btn-sm self-start">
          {submitting ? "Saving…" : "Add Staff Member"}
        </button>
      </form>

      {state === "loading" && <p className="text-sm text-slate mt-5">Loading staff…</p>}

      {state === "forbidden" && (
        <div className="mt-4 px-3.5 py-3 rounded-lg bg-sun-soft text-clay text-[0.85rem] font-semibold">
          You&rsquo;re logged in, but this account isn&rsquo;t authorized to manage staff profiles.
        </div>
      )}

      {state === "error" && (
        <div className="mt-4 px-3.5 py-3 rounded-lg bg-clay-soft text-clay text-[0.85rem] font-semibold">
          Couldn&rsquo;t load staff. Please try again.
        </div>
      )}

      {state === "ready" && staff.length === 0 && (
        <p className="text-sm text-slate mt-5">No staff profiles yet.</p>
      )}

      {state === "ready" && staff.length > 0 && (
        <ul className="flex flex-col gap-2.5 mt-4">
          {staff.map((member) => {
            const isEditing = editingId === member.id;

            return (
              <li key={member.id} className="px-3.5 py-3 rounded-lg bg-chalk">
                {isEditing && editForm ? (
                  <div className="flex flex-col gap-2">
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
                      placeholder="Role"
                      value={editForm.role}
                      onChange={(e) => setEditForm((form) => (form ? { ...form, role: e.target.value } : form))}
                      required
                      className="text-sm rounded-md border border-slate/20 bg-chalk text-ink px-3 py-2"
                    />
                    <textarea
                      placeholder="Bio"
                      value={editForm.bio}
                      onChange={(e) => setEditForm((form) => (form ? { ...form, bio: e.target.value } : form))}
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
                        onClick={() => saveEdit(member.id, false)}
                        disabled={editSubmitting}
                        className="btn btn-primary btn-sm"
                      >
                        {editSubmitting ? "Saving…" : "Save"}
                      </button>
                      {member.photoUrl && (
                        <button
                          type="button"
                          onClick={() => saveEdit(member.id, true)}
                          disabled={editSubmitting}
                          className="btn btn-ghost btn-sm"
                        >
                          Remove Photo
                        </button>
                      )}
                      <button type="button" onClick={cancelEdit} className="btn btn-ghost btn-sm">
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm font-semibold">
                        {member.name} · {member.role}
                      </span>
                      <span className="text-xs text-slate">Order {member.order}</span>
                    </div>
                    <p className="text-sm mt-1 mb-0 text-slate">{member.bio}</p>
                    {member.photoUrl && (
                      <p className="text-xs mt-1.5 mb-0 text-slate">Photo uploaded</p>
                    )}
                    <div className="flex items-center gap-2 mt-2.5">
                      <button type="button" onClick={() => startEdit(member)} className="btn btn-ghost btn-sm">
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteStaff(member.id)}
                        disabled={deletingId === member.id}
                        className="btn btn-ghost btn-sm"
                      >
                        {deletingId === member.id ? "Deleting…" : "Delete"}
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
