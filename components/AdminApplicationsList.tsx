"use client";

import { useEffect, useState } from "react";
import { signOut, type User } from "firebase/auth";
import { getFirebaseAuth } from "@/lib/firebase/client";
import type { Application, ApplicationStatus } from "@/lib/firebase/types";
import { stages } from "@/lib/data";
import { useListFilter } from "@/lib/useListFilter";

type LoadState = "loading" | "forbidden" | "error" | "ready";

const STATUS_OPTIONS: ApplicationStatus[] = ["new", "reviewing", "accepted", "waitlisted", "declined"];

const statusStyle: Record<ApplicationStatus, string> = {
  new: "bg-sun-soft text-clay",
  reviewing: "bg-ground-card text-accent-light",
  accepted: "bg-leaf-soft text-leaf",
  waitlisted: "bg-chalk text-slate",
  declined: "bg-clay-soft text-clay",
};

function stageLabel(code: string): string {
  return stages.find((s) => s.code === code)?.name ?? code;
}

function getSearchText(app: Application): string {
  return [app.childName, app.guardianName, app.email, app.phone].filter(Boolean).join(" ");
}

export default function AdminApplicationsList({ user }: { user: User }) {
  const [applications, setApplications] = useState<Application[]>([]);
  const [state, setState] = useState<LoadState>("loading");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<ApplicationStatus | "all">("all");

  const [childName, setChildName] = useState("");
  const [childDob, setChildDob] = useState("");
  const [desiredStage, setDesiredStage] = useState(stages[0].code);
  const [guardianName, setGuardianName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [posting, setPosting] = useState(false);
  const [postError, setPostError] = useState<string | null>(null);

  const statusFiltered =
    statusFilter === "all" ? applications : applications.filter((app) => app.status === statusFilter);
  const { query, setQuery, page, setPage, filtered, paged, totalPages } = useListFilter(
    statusFiltered,
    getSearchText
  );

  async function createApplication(e: React.FormEvent) {
    e.preventDefault();
    setPosting(true);
    setPostError(null);

    try {
      const idToken = await user.getIdToken();
      const res = await fetch("/api/admin/applications", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${idToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ childName, childDob, desiredStage, guardianName, email, phone, notes }),
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setPostError(data.error ?? "Couldn't add this application. Please try again.");
        return;
      }

      const created = (await res.json()) as Application;
      setApplications((current) => [created, ...current]);
      setChildName("");
      setChildDob("");
      setDesiredStage(stages[0].code);
      setGuardianName("");
      setEmail("");
      setPhone("");
      setNotes("");
    } catch {
      setPostError("Couldn't add this application. Please try again.");
    } finally {
      setPosting(false);
    }
  }

  async function deleteApplication(id: string) {
    const previous = applications;
    setDeletingId(id);
    setApplications((current) => current.filter((app) => app.id !== id));

    try {
      const idToken = await user.getIdToken();
      const res = await fetch(`/api/admin/applications/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${idToken}` },
      });

      if (!res.ok) {
        setApplications(previous);
      }
    } catch {
      setApplications(previous);
    } finally {
      setDeletingId(null);
    }
  }

  async function updateStatus(id: string, status: ApplicationStatus) {
    const previous = applications;
    setUpdatingId(id);
    setApplications((current) => current.map((app) => (app.id === id ? { ...app, status } : app)));

    try {
      const idToken = await user.getIdToken();
      const res = await fetch(`/api/admin/applications/${id}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${idToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status }),
      });

      if (!res.ok) {
        setApplications(previous);
      }
    } catch {
      setApplications(previous);
    } finally {
      setUpdatingId(null);
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setState("loading");
      try {
        const idToken = await user.getIdToken();
        const res = await fetch("/api/admin/applications", {
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

        const data = (await res.json()) as { applications: Application[] };
        setApplications(data.applications);
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
          <h4 className="font-display text-xl mb-0.5">Applications</h4>
          <p className="text-[0.85rem] text-slate">{user.email}</p>
        </div>
        <button onClick={() => signOut(getFirebaseAuth())} className="btn btn-ghost btn-sm">
          Log Out
        </button>
      </div>

      <form onSubmit={createApplication} className="mt-5 flex flex-col gap-2.5">
        <input
          type="text"
          placeholder="Child's full name"
          value={childName}
          onChange={(e) => setChildName(e.target.value)}
          required
          className="text-sm rounded-md border border-slate/20 bg-chalk text-ink px-3 py-2"
        />
        <input
          type="date"
          value={childDob}
          onChange={(e) => setChildDob(e.target.value)}
          required
          aria-label="Child's date of birth"
          className="text-sm rounded-md border border-slate/20 bg-chalk text-ink px-3 py-2"
        />
        <select
          value={desiredStage}
          onChange={(e) => setDesiredStage(e.target.value)}
          required
          aria-label="Desired stage"
          className="text-sm rounded-md border border-slate/20 bg-chalk text-ink px-3 py-2"
        >
          {stages.map((s) => (
            <option key={s.code} value={s.code}>
              {s.name} ({s.age})
            </option>
          ))}
        </select>
        <input
          type="text"
          placeholder="Guardian full name"
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
          className="text-sm rounded-md border border-slate/20 bg-chalk text-ink px-3 py-2"
        />
        <input
          type="tel"
          placeholder="Phone"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="text-sm rounded-md border border-slate/20 bg-chalk text-ink px-3 py-2"
        />
        <textarea
          placeholder="Notes (optional)"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          className="text-sm rounded-md border border-slate/20 bg-chalk text-ink px-3 py-2"
        />
        {postError && <p className="text-[0.8rem] text-clay mb-0">{postError}</p>}
        <button type="submit" disabled={posting} className="btn btn-primary btn-sm self-start">
          {posting ? "Adding…" : "Add Application"}
        </button>
      </form>

      {state === "loading" && <p className="text-sm text-slate mt-5">Loading applications…</p>}

      {state === "forbidden" && (
        <div className="mt-4 px-3.5 py-3 rounded-lg bg-sun-soft text-clay text-[0.85rem] font-semibold">
          You&rsquo;re logged in, but this account isn&rsquo;t authorized to view applications.
        </div>
      )}

      {state === "error" && (
        <div className="mt-4 px-3.5 py-3 rounded-lg bg-clay-soft text-clay text-[0.85rem] font-semibold">
          Couldn&rsquo;t load applications. Please try again.
        </div>
      )}

      {state === "ready" && applications.length === 0 && (
        <p className="text-sm text-slate mt-5">No applications yet.</p>
      )}

      {state === "ready" && applications.length > 0 && (
        <div className="flex flex-wrap gap-2.5 mt-5">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by child, guardian, email, or phone…"
            aria-label="Search applications"
            className="flex-1 min-w-[200px] text-sm rounded-md border border-slate/20 bg-chalk text-ink px-3 py-2"
          />
          <select
            aria-label="Filter by status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as ApplicationStatus | "all")}
            className="text-sm rounded-md border border-slate/20 bg-chalk text-ink px-3 py-2"
          >
            <option value="all">All statuses</option>
            {STATUS_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>
      )}

      {state === "ready" && applications.length > 0 && filtered.length === 0 && (
        <p className="text-sm text-slate mt-4">No matching applications.</p>
      )}

      {state === "ready" && paged.length > 0 && (
        <ul className="flex flex-col gap-2.5 mt-4">
          {paged.map((app) => (
            <li key={app.id} className="px-3.5 py-3 rounded-lg bg-chalk">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-semibold">
                  {app.childName} · {stageLabel(app.desiredStage)}
                </span>
                <span className="text-xs text-slate">{new Date(app.createdAt).toLocaleString("en-NG")}</span>
              </div>
              <div className="text-xs text-slate mt-0.5">
                DOB {app.childDob} · Guardian: {app.guardianName}
              </div>
              <div className="text-xs text-slate mt-0.5">
                {[app.email, app.phone].filter(Boolean).join(" · ") || "No contact info given"}
              </div>
              {app.notes && <p className="text-sm mt-2 mb-0">{app.notes}</p>}
              <div className="flex items-center gap-2.5 mt-2.5">
                <span className={`text-[0.7rem] font-bold px-2.5 py-1 rounded-full ${statusStyle[app.status]}`}>
                  {app.status}
                </span>
                <select
                  aria-label={`Status for ${app.childName}`}
                  value={app.status}
                  disabled={updatingId === app.id}
                  onChange={(e) => updateStatus(app.id, e.target.value as ApplicationStatus)}
                  className="text-xs rounded-md border border-slate/20 bg-chalk text-ink px-2 py-1"
                >
                  {STATUS_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => deleteApplication(app.id)}
                  disabled={deletingId === app.id}
                  className="btn btn-ghost btn-sm ml-auto"
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
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
