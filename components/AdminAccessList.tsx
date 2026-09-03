"use client";

import { useEffect, useState } from "react";
import { signOut, type User } from "firebase/auth";
import { getFirebaseAuth } from "@/lib/firebase/client";
import { ADMIN_AREAS, type AdminArea, type AdminUser } from "@/lib/firebase/types";
import { useListFilter } from "@/lib/useListFilter";

type LoadState = "loading" | "forbidden" | "error" | "ready";

type AdminRow = AdminUser & { disabled: boolean };

type LastCreated = { resetLink: string | null; emailSent: boolean };

type EditForm = { displayName: string; isSuperAdmin: boolean; areas: AdminArea[] };

type RowActionState = { status: "pending" } | { status: "error"; message: string };

function InviteBanner({
  emailSent,
  resetLink,
  onCopy,
  copied,
}: LastCreated & { onCopy: () => void; copied: boolean }) {
  if (emailSent) {
    return <>Account created — an invite email has been sent.</>;
  }
  return (
    <div className="flex flex-col gap-2">
      <span>Account created. Email wasn&rsquo;t sent — share this set-password link with them:</span>
      <div className="flex items-center gap-2">
        <code className="text-xs bg-chalk text-ink px-2 py-1 rounded break-all">{resetLink}</code>
        <button type="button" onClick={onCopy} className="btn btn-ghost btn-sm">
          {copied ? "Copied" : "Copy Link"}
        </button>
      </div>
    </div>
  );
}

function AreaCheckboxes({
  areas,
  onChange,
  disabled,
}: {
  areas: AdminArea[];
  onChange: (areas: AdminArea[]) => void;
  disabled: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1.5">
      {ADMIN_AREAS.map((area) => (
        <label key={area} className="flex items-center gap-1.5 text-sm">
          <input
            type="checkbox"
            checked={areas.includes(area)}
            disabled={disabled}
            onChange={(e) =>
              onChange(e.target.checked ? [...areas, area] : areas.filter((a) => a !== area))
            }
          />
          {area}
        </label>
      ))}
    </div>
  );
}

function getSearchText(admin: AdminRow): string {
  return [admin.displayName, admin.email, ...admin.areas].join(" ");
}

export default function AdminAccessList({ user }: { user: User }) {
  const [admins, setAdmins] = useState<AdminRow[]>([]);
  const [state, setState] = useState<LoadState>("loading");

  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [areas, setAreas] = useState<AdminArea[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [lastCreated, setLastCreated] = useState<LastCreated | null>(null);
  const [copied, setCopied] = useState(false);

  const [editingUid, setEditingUid] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<EditForm | null>(null);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const [rowState, setRowState] = useState<Record<string, RowActionState>>({});

  const { query, setQuery, page, setPage, filtered, paged, totalPages } = useListFilter(
    admins,
    getSearchText
  );

  async function createAdmin(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setSubmitError(null);
    setCopied(false);

    try {
      const idToken = await user.getIdToken();
      const res = await fetch("/api/admin/access", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${idToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ displayName, email, isSuperAdmin, areas }),
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setSubmitError(data.error ?? "Couldn't create this account. Please try again.");
        return;
      }

      const created = (await res.json()) as AdminUser & LastCreated;
      setAdmins((current) => [{ ...created, disabled: false }, ...current]);
      setLastCreated({ resetLink: created.resetLink, emailSent: created.emailSent });
      setDisplayName("");
      setEmail("");
      setIsSuperAdmin(false);
      setAreas([]);
    } catch {
      setSubmitError("Couldn't create this account. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function copyResetLink() {
    if (!lastCreated?.resetLink) return;
    try {
      await navigator.clipboard.writeText(lastCreated.resetLink);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  function startEdit(admin: AdminRow) {
    setEditingUid(admin.uid);
    setEditForm({ displayName: admin.displayName, isSuperAdmin: admin.isSuperAdmin, areas: admin.areas });
    setEditError(null);
  }

  function cancelEdit() {
    setEditingUid(null);
    setEditForm(null);
    setEditError(null);
  }

  async function saveEdit(uid: string) {
    if (!editForm) return;
    setEditSubmitting(true);
    setEditError(null);

    try {
      const idToken = await user.getIdToken();
      const res = await fetch(`/api/admin/access/${uid}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${idToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          displayName: editForm.displayName,
          isSuperAdmin: editForm.isSuperAdmin,
          areas: editForm.areas,
        }),
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setEditError(data.error ?? "Couldn't save these changes. Please try again.");
        return;
      }

      setAdmins((current) =>
        current.map((admin) =>
          admin.uid === uid
            ? { ...admin, displayName: editForm.displayName, isSuperAdmin: editForm.isSuperAdmin, areas: editForm.areas }
            : admin
        )
      );
      setEditingUid(null);
      setEditForm(null);
    } catch {
      setEditError("Couldn't save these changes. Please try again.");
    } finally {
      setEditSubmitting(false);
    }
  }

  async function toggleDisabled(admin: AdminRow) {
    const nextDisabled = !admin.disabled;
    setRowState((current) => ({ ...current, [admin.uid]: { status: "pending" } }));

    try {
      const idToken = await user.getIdToken();
      const res = await fetch(`/api/admin/access/${admin.uid}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${idToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ disabled: nextDisabled }),
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setRowState((current) => ({
          ...current,
          [admin.uid]: { status: "error", message: data.error ?? "Couldn't update this account. Please try again." },
        }));
        return;
      }

      setAdmins((current) => current.map((a) => (a.uid === admin.uid ? { ...a, disabled: nextDisabled } : a)));
      setRowState((current) => {
        const next = { ...current };
        delete next[admin.uid];
        return next;
      });
    } catch {
      setRowState((current) => ({
        ...current,
        [admin.uid]: { status: "error", message: "Couldn't update this account. Please try again." },
      }));
    }
  }

  async function removeAdmin(admin: AdminRow) {
    setRowState((current) => ({ ...current, [admin.uid]: { status: "pending" } }));

    try {
      const idToken = await user.getIdToken();
      const res = await fetch(`/api/admin/access/${admin.uid}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${idToken}` },
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setRowState((current) => ({
          ...current,
          [admin.uid]: { status: "error", message: data.error ?? "Couldn't remove this account. Please try again." },
        }));
        return;
      }

      setAdmins((current) => current.filter((a) => a.uid !== admin.uid));
      setRowState((current) => {
        const next = { ...current };
        delete next[admin.uid];
        return next;
      });
    } catch {
      setRowState((current) => ({
        ...current,
        [admin.uid]: { status: "error", message: "Couldn't remove this account. Please try again." },
      }));
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setState("loading");
      try {
        const idToken = await user.getIdToken();
        const res = await fetch("/api/admin/access", {
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

        const data = (await res.json()) as { admins: AdminRow[] };
        setAdmins(data.admins);
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
          <h4 className="font-display text-xl mb-0.5">Admin Accounts</h4>
          <p className="text-[0.85rem] text-slate">{user.email}</p>
        </div>
        <button onClick={() => signOut(getFirebaseAuth())} className="btn btn-ghost btn-sm">
          Log Out
        </button>
      </div>

      <form onSubmit={createAdmin} className="mt-5 flex flex-col gap-2.5">
        <input
          type="text"
          placeholder="Display name"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          required
          className="text-sm rounded-md border border-slate/20 bg-chalk text-ink px-3 py-2"
        />
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="text-sm rounded-md border border-slate/20 bg-chalk text-ink px-3 py-2"
        />
        <label className="flex items-center gap-1.5 text-sm">
          <input
            type="checkbox"
            checked={isSuperAdmin}
            onChange={(e) => setIsSuperAdmin(e.target.checked)}
          />
          Superadmin (full access to every area, including managing other admins)
        </label>
        {!isSuperAdmin && <AreaCheckboxes areas={areas} onChange={setAreas} disabled={false} />}

        {submitError && <p className="text-[0.8rem] text-clay mb-0">{submitError}</p>}
        <button type="submit" disabled={submitting} className="btn btn-primary btn-sm self-start">
          {submitting ? "Creating…" : "Create Admin"}
        </button>
      </form>

      {lastCreated && (
        <div className="mt-4 px-3.5 py-3 rounded-lg bg-leaf-soft text-leaf text-[0.85rem] font-semibold">
          <InviteBanner {...lastCreated} onCopy={copyResetLink} copied={copied} />
        </div>
      )}

      {state === "loading" && <p className="text-sm text-slate mt-5">Loading admin accounts…</p>}

      {state === "forbidden" && (
        <div className="mt-4 px-3.5 py-3 rounded-lg bg-sun-soft text-clay text-[0.85rem] font-semibold">
          You&rsquo;re logged in, but this account isn&rsquo;t authorized to manage admin accounts.
        </div>
      )}

      {state === "error" && (
        <div className="mt-4 px-3.5 py-3 rounded-lg bg-clay-soft text-clay text-[0.85rem] font-semibold">
          Couldn&rsquo;t load admin accounts. Please try again.
        </div>
      )}

      {state === "ready" && admins.length === 0 && (
        <p className="text-sm text-slate mt-5">No admin accounts yet.</p>
      )}

      {state === "ready" && admins.length > 0 && (
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name, email, or area…"
          aria-label="Search admin accounts"
          className="mt-5 w-full text-sm rounded-md border border-slate/20 bg-chalk text-ink px-3 py-2"
        />
      )}

      {state === "ready" && admins.length > 0 && filtered.length === 0 && (
        <p className="text-sm text-slate mt-4">No matching admin accounts.</p>
      )}

      {state === "ready" && paged.length > 0 && (
        <ul className="flex flex-col gap-2.5 mt-4">
          {paged.map((admin) => {
            const isSelf = admin.uid === user.uid;
            const isEditing = editingUid === admin.uid;
            const action = rowState[admin.uid];

            return (
              <li key={admin.uid} className="px-3.5 py-3 rounded-lg bg-chalk">
                {isEditing && editForm ? (
                  <div className="flex flex-col gap-2">
                    <input
                      type="text"
                      placeholder="Display name"
                      value={editForm.displayName}
                      onChange={(e) => setEditForm((form) => (form ? { ...form, displayName: e.target.value } : form))}
                      required
                      className="text-sm rounded-md border border-slate/20 bg-chalk text-ink px-3 py-2"
                    />
                    <label className="flex items-center gap-1.5 text-sm">
                      <input
                        type="checkbox"
                        checked={editForm.isSuperAdmin}
                        onChange={(e) =>
                          setEditForm((form) => (form ? { ...form, isSuperAdmin: e.target.checked } : form))
                        }
                      />
                      Superadmin
                    </label>
                    {!editForm.isSuperAdmin && (
                      <AreaCheckboxes
                        areas={editForm.areas}
                        onChange={(next) => setEditForm((form) => (form ? { ...form, areas: next } : form))}
                        disabled={false}
                      />
                    )}
                    {editError && <p className="text-[0.8rem] text-clay mb-0">{editError}</p>}
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => saveEdit(admin.uid)}
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
                        {admin.displayName}
                        {isSelf && (
                          <span className="ml-2 text-[0.7rem] font-bold px-2.5 py-1 rounded-full bg-leaf-soft text-leaf align-middle">
                            You
                          </span>
                        )}
                      </span>
                      <span className="text-xs text-slate">{new Date(admin.createdAt).toLocaleString("en-NG")}</span>
                    </div>
                    <p className="text-sm mt-1 mb-0 text-slate">
                      {admin.email}
                      {admin.disabled && (
                        <span className="ml-2 text-[0.7rem] font-bold px-2.5 py-1 rounded-full bg-clay-soft text-clay align-middle">
                          Disabled
                        </span>
                      )}
                    </p>
                    <div className="flex flex-wrap gap-1.5 mt-2.5">
                      {admin.isSuperAdmin ? (
                        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-chalk text-ink border border-slate/20">
                          Superadmin
                        </span>
                      ) : (
                        admin.areas.map((area) => (
                          <span key={area} className="text-xs font-semibold px-2.5 py-1 rounded-full bg-chalk text-ink border border-slate/20">
                            {area}
                          </span>
                        ))
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-2.5">
                      <button type="button" onClick={() => startEdit(admin)} className="btn btn-ghost btn-sm">
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleDisabled(admin)}
                        disabled={isSelf || action?.status === "pending"}
                        title={isSelf ? "You can't disable your own account" : undefined}
                        className="btn btn-ghost btn-sm"
                      >
                        {action?.status === "pending" ? "Updating…" : admin.disabled ? "Reactivate" : "Deactivate"}
                      </button>
                      <button
                        type="button"
                        onClick={() => removeAdmin(admin)}
                        disabled={isSelf || action?.status === "pending"}
                        title={isSelf ? "You can't remove your own admin access" : undefined}
                        className="btn btn-ghost btn-sm"
                      >
                        Remove
                      </button>
                    </div>
                    {action?.status === "error" && (
                      <p className="text-[0.8rem] text-clay mt-2 mb-0">{action.message}</p>
                    )}
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
