"use client";

import { useEffect, useState } from "react";
import { signOut, type User } from "firebase/auth";
import { getFirebaseAuth } from "@/lib/firebase/client";
import { stages } from "@/lib/data";
import type { Parent } from "@/lib/firebase/types";
import { useListFilter } from "@/lib/useListFilter";

type LoadState = "loading" | "forbidden" | "error" | "ready";

type ChildFormRow = { name: string; stage: string; admissionNo: string };
type EditChildRow = ChildFormRow & { id?: string };

type LastCreated = { resetLink: string | null; emailSent: boolean };

type ResendState = { status: "pending" } | { status: "done"; resetLink: string | null; emailSent: boolean };

type EditForm = { guardianName: string; email: string; phone: string; children: EditChildRow[] };

type DisableState = { status: "pending" } | { status: "error"; message: string };

function blankChildRow(): ChildFormRow {
  return { name: "", stage: stages[0]?.code ?? "", admissionNo: "" };
}

function ChildRowFields({
  child,
  onChange,
  onRemove,
  removeDisabled,
}: {
  child: ChildFormRow;
  onChange: (patch: Partial<ChildFormRow>) => void;
  onRemove: () => void;
  removeDisabled: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      <input
        type="text"
        placeholder="Child's name"
        value={child.name}
        onChange={(e) => onChange({ name: e.target.value })}
        required
        className="text-sm rounded-md border border-slate/20 bg-chalk text-ink px-3 py-2 flex-1"
      />
      <select
        value={child.stage}
        onChange={(e) => onChange({ stage: e.target.value })}
        className="text-sm rounded-md border border-slate/20 bg-chalk text-ink px-3 py-2"
      >
        {stages.map((stage) => (
          <option key={stage.code} value={stage.code}>
            {stage.name}
          </option>
        ))}
      </select>
      <input
        type="text"
        placeholder="Admission no. (optional)"
        value={child.admissionNo}
        onChange={(e) => onChange({ admissionNo: e.target.value })}
        className="text-sm rounded-md border border-slate/20 bg-chalk text-ink px-3 py-2 w-40"
      />
      <button type="button" onClick={onRemove} disabled={removeDisabled} className="btn btn-ghost btn-sm">
        Remove
      </button>
    </div>
  );
}

function InviteBanner({
  emailSent,
  resetLink,
  onCopy,
  copied,
  sentMessage,
  notSentIntro,
}: LastCreated & { onCopy: () => void; copied: boolean; sentMessage: string; notSentIntro: string }) {
  if (emailSent) {
    return <>{sentMessage}</>;
  }
  return (
    <div className="flex flex-col gap-2">
      <span>{notSentIntro}</span>
      <div className="flex items-center gap-2">
        <code className="text-xs bg-chalk text-ink px-2 py-1 rounded break-all">{resetLink}</code>
        <button type="button" onClick={onCopy} className="btn btn-ghost btn-sm">
          {copied ? "Copied" : "Copy Link"}
        </button>
      </div>
    </div>
  );
}

function getSearchText(parent: Parent): string {
  return [parent.guardianName, parent.email, parent.phone, ...parent.children.map((c) => c.name)]
    .filter(Boolean)
    .join(" ");
}

export default function AdminParentsList({ user }: { user: User }) {
  const [parents, setParents] = useState<Parent[]>([]);
  const [state, setState] = useState<LoadState>("loading");
  const [stageFilter, setStageFilter] = useState<string>("all");
  const [guardianName, setGuardianName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [children, setChildren] = useState<ChildFormRow[]>([blankChildRow()]);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [lastCreated, setLastCreated] = useState<LastCreated | null>(null);
  const [copied, setCopied] = useState(false);

  const [editingUid, setEditingUid] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<EditForm | null>(null);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const [resendState, setResendState] = useState<Record<string, ResendState>>({});
  const [copiedResendUid, setCopiedResendUid] = useState<string | null>(null);

  const [disableState, setDisableState] = useState<Record<string, DisableState>>({});

  const stageFiltered =
    stageFilter === "all" ? parents : parents.filter((p) => p.children.some((c) => c.stage === stageFilter));
  const { query, setQuery, page, setPage, filtered, paged, totalPages } = useListFilter(
    stageFiltered,
    getSearchText
  );

  function updateChild(index: number, patch: Partial<ChildFormRow>) {
    setChildren((current) => current.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  function addChildRow() {
    setChildren((current) => [...current, blankChildRow()]);
  }

  function removeChildRow(index: number) {
    setChildren((current) => (current.length > 1 ? current.filter((_, i) => i !== index) : current));
  }

  async function createParent(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setSubmitError(null);
    setCopied(false);

    try {
      const idToken = await user.getIdToken();
      const res = await fetch("/api/admin/parents", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${idToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          guardianName,
          email,
          phone,
          children: children.map(({ name, stage, admissionNo }) => ({ name, stage, admissionNo })),
        }),
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setSubmitError(data.error ?? "Couldn't create this account. Please try again.");
        return;
      }

      const created = (await res.json()) as Parent & LastCreated;
      setParents((current) => [created, ...current]);
      setLastCreated({ resetLink: created.resetLink, emailSent: created.emailSent });
      setGuardianName("");
      setEmail("");
      setPhone("");
      setChildren([blankChildRow()]);
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

  function startEdit(parent: Parent) {
    setEditingUid(parent.uid);
    setEditForm({
      guardianName: parent.guardianName,
      email: parent.email,
      phone: parent.phone ?? "",
      children: parent.children.map((child) => ({
        id: child.id,
        name: child.name,
        stage: child.stage,
        admissionNo: child.admissionNo ?? "",
      })),
    });
    setEditError(null);
  }

  function cancelEdit() {
    setEditingUid(null);
    setEditForm(null);
    setEditError(null);
  }

  function updateEditChild(index: number, patch: Partial<ChildFormRow>) {
    setEditForm((form) =>
      form ? { ...form, children: form.children.map((row, i) => (i === index ? { ...row, ...patch } : row)) } : form
    );
  }

  function addEditChildRow() {
    setEditForm((form) => (form ? { ...form, children: [...form.children, blankChildRow()] } : form));
  }

  function removeEditChildRow(index: number) {
    setEditForm((form) =>
      form && form.children.length > 1 ? { ...form, children: form.children.filter((_, i) => i !== index) } : form
    );
  }

  async function saveEdit(uid: string) {
    if (!editForm) return;
    setEditSubmitting(true);
    setEditError(null);

    try {
      const idToken = await user.getIdToken();
      const res = await fetch(`/api/admin/parents/${uid}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${idToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          guardianName: editForm.guardianName,
          email: editForm.email,
          phone: editForm.phone,
          children: editForm.children.map(({ id, name, stage, admissionNo }) => ({ id, name, stage, admissionNo })),
        }),
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setEditError(data.error ?? "Couldn't save these changes. Please try again.");
        return;
      }

      const updated = (await res.json()) as {
        guardianName: string;
        email: string;
        phone: string;
        children: Parent["children"];
      };
      setParents((current) =>
        current.map((parent) =>
          parent.uid === uid
            ? {
                ...parent,
                guardianName: updated.guardianName,
                email: updated.email,
                phone: updated.phone,
                children: updated.children,
              }
            : parent
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

  async function resendInvite(uid: string) {
    setResendState((current) => ({ ...current, [uid]: { status: "pending" } }));

    try {
      const idToken = await user.getIdToken();
      const res = await fetch(`/api/admin/parents/${uid}/resend-invite`, {
        method: "POST",
        headers: { Authorization: `Bearer ${idToken}` },
      });

      if (!res.ok) {
        setResendState((current) => {
          const next = { ...current };
          delete next[uid];
          return next;
        });
        return;
      }

      const data = (await res.json()) as LastCreated;
      setResendState((current) => ({ ...current, [uid]: { status: "done", ...data } }));
    } catch {
      setResendState((current) => {
        const next = { ...current };
        delete next[uid];
        return next;
      });
    }
  }

  async function copyResendLink(uid: string, link: string) {
    try {
      await navigator.clipboard.writeText(link);
      setCopiedResendUid(uid);
    } catch {
      setCopiedResendUid(null);
    }
  }

  async function toggleDisabled(parent: Parent) {
    const nextDisabled = !parent.disabled;
    setDisableState((current) => ({ ...current, [parent.uid]: { status: "pending" } }));

    try {
      const idToken = await user.getIdToken();
      const res = await fetch(`/api/admin/parents/${parent.uid}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${idToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ disabled: nextDisabled }),
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setDisableState((current) => ({
          ...current,
          [parent.uid]: { status: "error", message: data.error ?? "Couldn't update this account. Please try again." },
        }));
        return;
      }

      setParents((current) =>
        current.map((p) => (p.uid === parent.uid ? { ...p, disabled: nextDisabled } : p))
      );
      setDisableState((current) => {
        const next = { ...current };
        delete next[parent.uid];
        return next;
      });
    } catch {
      setDisableState((current) => ({
        ...current,
        [parent.uid]: { status: "error", message: "Couldn't update this account. Please try again." },
      }));
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setState("loading");
      try {
        const idToken = await user.getIdToken();
        const res = await fetch("/api/admin/parents", {
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

        const data = (await res.json()) as { parents: Parent[] };
        setParents(data.parents);
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
          <h4 className="font-display text-xl mb-0.5">Parent Accounts</h4>
          <p className="text-[0.85rem] text-slate">{user.email}</p>
        </div>
        <button onClick={() => signOut(getFirebaseAuth())} className="btn btn-ghost btn-sm">
          Log Out
        </button>
      </div>

      <form onSubmit={createParent} className="mt-5 flex flex-col gap-2.5">
        <input
          type="text"
          placeholder="Guardian name"
          value={guardianName}
          onChange={(e) => setGuardianName(e.target.value)}
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
        <input
          type="text"
          placeholder="Phone (optional)"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="text-sm rounded-md border border-slate/20 bg-chalk text-ink px-3 py-2"
        />

        <div className="flex flex-col gap-2 mt-1.5">
          {children.map((child, index) => (
            <ChildRowFields
              key={index}
              child={child}
              onChange={(patch) => updateChild(index, patch)}
              onRemove={() => removeChildRow(index)}
              removeDisabled={children.length === 1}
            />
          ))}
          <button type="button" onClick={addChildRow} className="btn btn-ghost btn-sm self-start">
            + Add Child
          </button>
        </div>

        {submitError && <p className="text-[0.8rem] text-clay mb-0">{submitError}</p>}
        <button type="submit" disabled={submitting} className="btn btn-primary btn-sm self-start">
          {submitting ? "Creating…" : "Create Account"}
        </button>
      </form>

      {lastCreated && (
        <div className="mt-4 px-3.5 py-3 rounded-lg bg-leaf-soft text-leaf text-[0.85rem] font-semibold">
          <InviteBanner
            {...lastCreated}
            onCopy={copyResetLink}
            copied={copied}
            sentMessage="Account created — an invite email has been sent to the parent."
            notSentIntro="Account created. Email wasn’t sent — share this set-password link with the parent:"
          />
        </div>
      )}

      {state === "loading" && <p className="text-sm text-slate mt-5">Loading parent accounts…</p>}

      {state === "forbidden" && (
        <div className="mt-4 px-3.5 py-3 rounded-lg bg-sun-soft text-clay text-[0.85rem] font-semibold">
          You&rsquo;re logged in, but this account isn&rsquo;t authorized to manage parent accounts.
        </div>
      )}

      {state === "error" && (
        <div className="mt-4 px-3.5 py-3 rounded-lg bg-clay-soft text-clay text-[0.85rem] font-semibold">
          Couldn&rsquo;t load parent accounts. Please try again.
        </div>
      )}

      {state === "ready" && parents.length === 0 && (
        <p className="text-sm text-slate mt-5">No parent accounts yet.</p>
      )}

      {state === "ready" && parents.length > 0 && (
        <div className="flex flex-wrap gap-2.5 mt-5">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by guardian, email, phone, or child name…"
            aria-label="Search parent accounts"
            className="flex-1 min-w-[200px] text-sm rounded-md border border-slate/20 bg-chalk text-ink px-3 py-2"
          />
          <select
            aria-label="Filter by stage"
            value={stageFilter}
            onChange={(e) => setStageFilter(e.target.value)}
            className="text-sm rounded-md border border-slate/20 bg-chalk text-ink px-3 py-2"
          >
            <option value="all">All stages</option>
            {stages.map((stage) => (
              <option key={stage.code} value={stage.code}>
                {stage.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {state === "ready" && parents.length > 0 && filtered.length === 0 && (
        <p className="text-sm text-slate mt-4">No matching parent accounts.</p>
      )}

      {state === "ready" && paged.length > 0 && (
        <ul className="flex flex-col gap-2.5 mt-4">
          {paged.map((parent) => {
            const resend = resendState[parent.uid];
            const isEditing = editingUid === parent.uid;

            return (
              <li key={parent.uid} className="px-3.5 py-3 rounded-lg bg-chalk">
                {isEditing && editForm ? (
                  <div className="flex flex-col gap-2">
                    <input
                      type="text"
                      placeholder="Guardian name"
                      value={editForm.guardianName}
                      onChange={(e) => setEditForm((form) => (form ? { ...form, guardianName: e.target.value } : form))}
                      required
                      className="text-sm rounded-md border border-slate/20 bg-chalk text-ink px-3 py-2"
                    />
                    <input
                      type="email"
                      placeholder="Email"
                      value={editForm.email}
                      onChange={(e) => setEditForm((form) => (form ? { ...form, email: e.target.value } : form))}
                      required
                      className="text-sm rounded-md border border-slate/20 bg-chalk text-ink px-3 py-2"
                    />
                    <input
                      type="text"
                      placeholder="Phone (optional)"
                      value={editForm.phone}
                      onChange={(e) => setEditForm((form) => (form ? { ...form, phone: e.target.value } : form))}
                      className="text-sm rounded-md border border-slate/20 bg-chalk text-ink px-3 py-2"
                    />
                    <div className="flex flex-col gap-2">
                      {editForm.children.map((child, index) => (
                        <ChildRowFields
                          key={index}
                          child={child}
                          onChange={(patch) => updateEditChild(index, patch)}
                          onRemove={() => removeEditChildRow(index)}
                          removeDisabled={editForm.children.length === 1}
                        />
                      ))}
                      <button type="button" onClick={addEditChildRow} className="btn btn-ghost btn-sm self-start">
                        + Add Child
                      </button>
                    </div>
                    {editError && <p className="text-[0.8rem] text-clay mb-0">{editError}</p>}
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => saveEdit(parent.uid)}
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
                      <span className="text-sm font-semibold">{parent.guardianName}</span>
                      <span className="text-xs text-slate">
                        {new Date(parent.createdAt).toLocaleString("en-NG")}
                      </span>
                    </div>
                    <p className="text-sm mt-1 mb-0 text-slate">
                      {parent.email}
                      {parent.phone ? ` · ${parent.phone}` : ""}
                      {parent.disabled && (
                        <span className="ml-2 text-[0.7rem] font-bold px-2.5 py-1 rounded-full bg-clay-soft text-clay align-middle">
                          Disabled
                        </span>
                      )}
                    </p>
                    <div className="flex flex-wrap gap-1.5 mt-2.5">
                      {parent.children.map((child) => (
                        <span key={child.id} className="text-xs font-semibold px-2.5 py-1 rounded-full bg-chalk text-ink">
                          {child.name} ({child.stage})
                        </span>
                      ))}
                    </div>
                    <div className="flex items-center gap-2 mt-2.5">
                      <button type="button" onClick={() => startEdit(parent)} className="btn btn-ghost btn-sm">
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => resendInvite(parent.uid)}
                        disabled={resend?.status === "pending"}
                        className="btn btn-ghost btn-sm"
                      >
                        {resend?.status === "pending" ? "Sending…" : "Resend Invite"}
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleDisabled(parent)}
                        disabled={disableState[parent.uid]?.status === "pending"}
                        className="btn btn-ghost btn-sm"
                      >
                        {disableState[parent.uid]?.status === "pending"
                          ? "Updating…"
                          : parent.disabled
                            ? "Reactivate"
                            : "Deactivate"}
                      </button>
                    </div>
                    {disableState[parent.uid]?.status === "error" && (
                      <p className="text-[0.8rem] text-clay mt-2 mb-0">
                        {(disableState[parent.uid] as { status: "error"; message: string }).message}
                      </p>
                    )}
                    {resend?.status === "done" && (
                      <div className="mt-2.5 px-3.5 py-3 rounded-lg bg-leaf-soft text-leaf text-[0.85rem] font-semibold">
                        <InviteBanner
                          emailSent={resend.emailSent}
                          resetLink={resend.resetLink}
                          onCopy={() => copyResendLink(parent.uid, resend.resetLink ?? "")}
                          copied={copiedResendUid === parent.uid}
                          sentMessage="A new invite email has been sent to the parent."
                          notSentIntro="Email wasn’t sent — share this new set-password link with the parent:"
                        />
                      </div>
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
