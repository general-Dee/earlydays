"use client";

import { useEffect, useState } from "react";
import { signOut, type User } from "firebase/auth";
import { getFirebaseAuth } from "@/lib/firebase/client";

type LoadState = "loading" | "forbidden" | "error" | "ready";

type SiteSettingsForm = {
  whatsapp: string;
  phone: string;
  email: string;
  notifyEmail: string;
  updatedAt?: number;
  updatedBy?: string;
};

const BLANK: SiteSettingsForm = { whatsapp: "", phone: "", email: "", notifyEmail: "" };

export default function AdminSettingsOverview({ user }: { user: User }) {
  const [state, setState] = useState<LoadState>("loading");
  const [draft, setDraft] = useState<SiteSettingsForm>(BLANK);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setState("loading");
      try {
        const idToken = await user.getIdToken();
        const res = await fetch("/api/admin/settings", {
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

        const data = (await res.json()) as SiteSettingsForm;
        setDraft(data);
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

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaveError(null);
    setSaved(false);

    try {
      const idToken = await user.getIdToken();
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${idToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(draft),
      });

      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        setSaveError(body.error ?? "Couldn't save these settings. Please try again.");
        return;
      }

      const data = (await res.json()) as SiteSettingsForm;
      setDraft(data);
      setSaved(true);
    } catch {
      setSaveError("Couldn't save these settings. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="card p-8 md:p-9 shadow-[0_20px_50px_-30px_rgba(22,33,62,0.3)]">
      <div className="flex items-start justify-between gap-4 mb-1">
        <div>
          <h4 className="font-display text-xl mb-0.5">Site Settings</h4>
          <p className="text-[0.85rem] text-slate">{user.email}</p>
        </div>
        <button onClick={() => signOut(getFirebaseAuth())} className="btn btn-ghost btn-sm">
          Log Out
        </button>
      </div>

      {state === "loading" && <p className="text-sm text-slate mt-5">Loading settings…</p>}

      {state === "forbidden" && (
        <div className="mt-4 px-3.5 py-3 rounded-lg bg-sun-soft text-clay text-[0.85rem] font-semibold">
          You&rsquo;re logged in, but this account isn&rsquo;t authorized to view settings.
        </div>
      )}

      {state === "error" && (
        <div className="mt-4 px-3.5 py-3 rounded-lg bg-clay-soft text-clay text-[0.85rem] font-semibold">
          Couldn&rsquo;t load settings. Please try again.
        </div>
      )}

      {state === "ready" && draft.updatedBy && (
        <p className="text-xs text-slate mt-4 mb-0">
          Last updated by {draft.updatedBy}
          {draft.updatedAt ? ` · ${new Date(draft.updatedAt).toLocaleString("en-NG")}` : ""}
        </p>
      )}

      {state === "ready" && (
        <form onSubmit={save} className="mt-5 flex flex-col gap-2.5 max-w-md">
          <label className="text-xs text-slate" htmlFor="settings-whatsapp">
            WhatsApp number (digits only, with country code)
          </label>
          <input
            id="settings-whatsapp"
            type="text"
            value={draft.whatsapp}
            onChange={(e) => setDraft((d) => ({ ...d, whatsapp: e.target.value }))}
            required
            className="text-sm rounded-md border border-slate/20 bg-chalk text-ink px-3 py-2"
          />

          <label className="text-xs text-slate" htmlFor="settings-phone">
            Display phone number
          </label>
          <input
            id="settings-phone"
            type="text"
            value={draft.phone}
            onChange={(e) => setDraft((d) => ({ ...d, phone: e.target.value }))}
            required
            className="text-sm rounded-md border border-slate/20 bg-chalk text-ink px-3 py-2"
          />

          <label className="text-xs text-slate" htmlFor="settings-email">
            Public contact email
          </label>
          <input
            id="settings-email"
            type="email"
            value={draft.email}
            onChange={(e) => setDraft((d) => ({ ...d, email: e.target.value }))}
            required
            className="text-sm rounded-md border border-slate/20 bg-chalk text-ink px-3 py-2"
          />

          <label className="text-xs text-slate" htmlFor="settings-notify-email">
            Admin notification email (new applications &amp; inquiries)
          </label>
          <input
            id="settings-notify-email"
            type="email"
            value={draft.notifyEmail}
            onChange={(e) => setDraft((d) => ({ ...d, notifyEmail: e.target.value }))}
            required
            className="text-sm rounded-md border border-slate/20 bg-chalk text-ink px-3 py-2"
          />

          {saveError && <p className="text-[0.8rem] text-clay mb-0">{saveError}</p>}
          {saved && <p className="text-[0.8rem] text-leaf mb-0">Saved.</p>}

          <button type="submit" disabled={saving} className="btn btn-primary btn-sm self-start">
            {saving ? "Saving…" : "Save Settings"}
          </button>
        </form>
      )}
    </div>
  );
}
