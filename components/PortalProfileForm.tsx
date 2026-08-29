"use client";

import { useState } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase/client";
import { COLLECTIONS } from "@/lib/firebase/collections";
import type { Parent } from "@/lib/firebase/types";

const MAX_NAME_LENGTH = 200;
const MAX_PHONE_LENGTH = 50;

export default function PortalProfileForm({
  uid,
  parent,
  onSaved,
}: {
  uid: string;
  parent: Pick<Parent, "guardianName" | "phone">;
  onSaved: (patch: { guardianName: string; phone?: string }) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [guardianName, setGuardianName] = useState(parent.guardianName);
  const [phone, setPhone] = useState(parent.phone ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function startEditing() {
    setGuardianName(parent.guardianName);
    setPhone(parent.phone ?? "");
    setError(null);
    setEditing(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const trimmedName = guardianName.trim();
    const trimmedPhone = phone.trim();

    if (!trimmedName) {
      setError("Name is required.");
      return;
    }
    if (trimmedName.length > MAX_NAME_LENGTH) {
      setError("Name is too long.");
      return;
    }
    if (trimmedPhone.length > MAX_PHONE_LENGTH) {
      setError("Phone number is too long.");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await updateDoc(doc(getFirebaseDb(), COLLECTIONS.parents, uid), {
        guardianName: trimmedName,
        phone: trimmedPhone,
      });
      onSaved({ guardianName: trimmedName, phone: trimmedPhone || undefined });
      setEditing(false);
    } catch {
      setError("Couldn’t save your changes. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!editing) {
    return (
      <div className="mt-5 flex items-start justify-between gap-4">
        <div>
          <h5 className="text-[0.78rem] font-medium text-slate uppercase tracking-wider mb-1">Guardian details</h5>
          <p className="text-sm font-semibold text-ink">{parent.guardianName}</p>
          {parent.phone && <p className="text-xs text-slate">{parent.phone}</p>}
        </div>
        <button type="button" onClick={startEditing} className="btn btn-ghost btn-sm">
          Edit
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-5">
      <h5 className="text-[0.78rem] font-medium text-slate uppercase tracking-wider mb-2.5">Edit guardian details</h5>

      <label htmlFor="profileGuardianName" className="block text-[0.78rem] font-medium text-slate mb-1.5">
        Name
      </label>
      <input
        id="profileGuardianName"
        type="text"
        value={guardianName}
        onChange={(e) => setGuardianName(e.target.value)}
        required
        className="w-full px-3.5 py-2.5 rounded-lg border border-line bg-chalk text-ink text-sm"
      />

      <label htmlFor="profilePhone" className="block text-[0.78rem] font-medium text-slate mt-3 mb-1.5">
        Phone
      </label>
      <input
        id="profilePhone"
        type="tel"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        placeholder="Phone (optional)"
        className="w-full px-3.5 py-2.5 rounded-lg border border-line bg-chalk text-ink text-sm"
      />

      <div className="flex items-center gap-2 mt-3.5">
        <button type="submit" disabled={submitting} className="btn btn-primary btn-sm disabled:opacity-60">
          {submitting ? "Saving…" : "Save"}
        </button>
        <button type="button" onClick={() => setEditing(false)} disabled={submitting} className="btn btn-ghost btn-sm">
          Cancel
        </button>
      </div>

      {error && (
        <div className="mt-3 px-3.5 py-2.5 rounded-lg bg-clay-soft text-clay text-[0.85rem] font-semibold">
          {error}
        </div>
      )}
    </form>
  );
}
