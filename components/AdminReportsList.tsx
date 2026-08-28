"use client";

import { useEffect, useRef, useState } from "react";
import { signOut, type User } from "firebase/auth";
import { getFirebaseAuth } from "@/lib/firebase/client";
import type { ChildRecord, ProgressReport } from "@/lib/firebase/types";
import { TERMS } from "@/lib/data";

type ParentOption = { uid: string; guardianName: string; email: string; children: ChildRecord[] };

type ParentsState = "loading" | "forbidden" | "error" | "ready";
type ReportsState = "idle" | "loading" | "error" | "ready";

export default function AdminReportsList({ user }: { user: User }) {
  const [parents, setParents] = useState<ParentOption[]>([]);
  const [parentsState, setParentsState] = useState<ParentsState>("loading");

  const [selectedParentUid, setSelectedParentUid] = useState("");
  const [selectedChildId, setSelectedChildId] = useState("");
  const [term, setTerm] = useState(TERMS[0]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [reports, setReports] = useState<ProgressReport[]>([]);
  const [reportsState, setReportsState] = useState<ReportsState>("idle");

  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setParentsState("loading");
      try {
        const idToken = await user.getIdToken();
        const res = await fetch("/api/admin/reports", {
          headers: { Authorization: `Bearer ${idToken}` },
        });

        if (cancelled) return;

        if (res.status === 403) {
          setParentsState("forbidden");
          return;
        }
        if (!res.ok) {
          setParentsState("error");
          return;
        }

        const data = (await res.json()) as { parents: ParentOption[] };
        setParents(data.parents);
        setParentsState("ready");
      } catch {
        if (!cancelled) setParentsState("error");
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [user]);

  useEffect(() => {
    if (!selectedParentUid) {
      setReports([]);
      setReportsState("idle");
      return;
    }

    let cancelled = false;

    async function load() {
      setReportsState("loading");
      try {
        const idToken = await user.getIdToken();
        const res = await fetch(`/api/admin/reports/${selectedParentUid}`, {
          headers: { Authorization: `Bearer ${idToken}` },
        });

        if (cancelled) return;

        if (!res.ok) {
          setReportsState("error");
          return;
        }

        const data = (await res.json()) as { reports: ProgressReport[] };
        setReports(data.reports);
        setReportsState("ready");
      } catch {
        if (!cancelled) setReportsState("error");
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [user, selectedParentUid]);

  const selectedParent = parents.find((p) => p.uid === selectedParentUid);

  function handleSelectParent(uid: string) {
    setSelectedParentUid(uid);
    const parent = parents.find((p) => p.uid === uid);
    setSelectedChildId(parent?.children[0]?.id ?? "");
  }

  async function uploadReport(e: React.FormEvent) {
    e.preventDefault();
    const child = selectedParent?.children.find((c) => c.id === selectedChildId);
    const file = fileInputRef.current?.files?.[0];

    if (!selectedParent || !child || !file) {
      setUploadError("Choose a parent, a child, and a PDF file.");
      return;
    }

    setUploading(true);
    setUploadError(null);

    try {
      const idToken = await user.getIdToken();
      const form = new FormData();
      form.set("parentUid", selectedParent.uid);
      form.set("childId", child.id);
      form.set("childName", child.name);
      form.set("term", term);
      form.set("file", file);

      const res = await fetch("/api/admin/reports", {
        method: "POST",
        headers: { Authorization: `Bearer ${idToken}` },
        body: form,
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setUploadError(data.error ?? "Couldn't upload this report. Please try again.");
        return;
      }

      const created = (await res.json()) as ProgressReport;
      setReports((current) => [created, ...current]);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch {
      setUploadError("Couldn't upload this report. Please try again.");
    } finally {
      setUploading(false);
    }
  }

  async function deleteReport(reportId: string) {
    const previous = reports;
    setDeletingId(reportId);
    setReports((current) => current.filter((r) => r.id !== reportId));

    try {
      const idToken = await user.getIdToken();
      const res = await fetch(`/api/admin/reports/${selectedParentUid}/${reportId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${idToken}` },
      });

      if (!res.ok) {
        setReports(previous);
      }
    } catch {
      setReports(previous);
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="card p-8 md:p-9 shadow-[0_20px_50px_-30px_rgba(22,33,62,0.3)]">
      <div className="flex items-start justify-between gap-4 mb-1">
        <div>
          <h4 className="font-display text-xl mb-0.5">Progress Reports</h4>
          <p className="text-[0.85rem] text-slate">{user.email}</p>
        </div>
        <button onClick={() => signOut(getFirebaseAuth())} className="btn btn-ghost btn-sm">
          Log Out
        </button>
      </div>

      {parentsState === "loading" && <p className="text-sm text-slate mt-5">Loading parents…</p>}

      {parentsState === "forbidden" && (
        <div className="mt-4 px-3.5 py-3 rounded-lg bg-sun-soft text-clay text-[0.85rem] font-semibold">
          You&rsquo;re logged in, but this account isn&rsquo;t authorized to manage progress reports.
        </div>
      )}

      {parentsState === "error" && (
        <div className="mt-4 px-3.5 py-3 rounded-lg bg-clay-soft text-clay text-[0.85rem] font-semibold">
          Couldn&rsquo;t load parents. Please try again.
        </div>
      )}

      {parentsState === "ready" && (
        <>
          <select
            value={selectedParentUid}
            onChange={(e) => handleSelectParent(e.target.value)}
            className="mt-5 w-full text-sm rounded-md border border-slate/20 bg-chalk text-ink px-3 py-2"
          >
            <option value="">Select a parent…</option>
            {parents.map((p) => (
              <option key={p.uid} value={p.uid}>
                {p.guardianName} — {p.email}
              </option>
            ))}
          </select>

          {selectedParent && (
            <form onSubmit={uploadReport} className="mt-3 flex flex-col gap-2.5">
              <select
                value={selectedChildId}
                onChange={(e) => setSelectedChildId(e.target.value)}
                required
                className="text-sm rounded-md border border-slate/20 bg-chalk text-ink px-3 py-2"
              >
                <option value="">Select a child…</option>
                {selectedParent.children.map((child) => (
                  <option key={child.id} value={child.id}>
                    {child.name} — {child.stage}
                  </option>
                ))}
              </select>
              <input
                type="text"
                placeholder="Term"
                value={term}
                onChange={(e) => setTerm(e.target.value)}
                required
                className="text-sm rounded-md border border-slate/20 bg-chalk text-ink px-3 py-2"
              />
              <input
                type="file"
                accept="application/pdf"
                ref={fileInputRef}
                required
                className="text-sm rounded-md border border-slate/20 bg-chalk text-ink px-3 py-2"
              />
              {uploadError && <p className="text-[0.8rem] text-clay mb-0">{uploadError}</p>}
              <button type="submit" disabled={uploading} className="btn btn-primary btn-sm self-start">
                {uploading ? "Uploading…" : "Upload Report"}
              </button>
            </form>
          )}

          {selectedParentUid && (
            <div className="mt-5">
              {reportsState === "loading" && <p className="text-sm text-slate">Loading reports…</p>}

              {reportsState === "error" && (
                <div className="px-3.5 py-3 rounded-lg bg-clay-soft text-clay text-[0.85rem] font-semibold">
                  Couldn&rsquo;t load reports. Please try again.
                </div>
              )}

              {reportsState === "ready" && reports.length === 0 && (
                <p className="text-sm text-slate">No reports uploaded for this parent yet.</p>
              )}

              {reportsState === "ready" && reports.length > 0 && (
                <ul className="flex flex-col gap-2.5">
                  {reports.map((report) => (
                    <li key={report.id} className="px-3.5 py-3 rounded-lg bg-chalk">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-sm font-semibold">
                          {report.childName} — {report.term}
                        </span>
                        <span className="text-xs text-slate">{report.fileName}</span>
                      </div>
                      <div className="flex items-center justify-end mt-2.5">
                        <button
                          onClick={() => deleteReport(report.id)}
                          disabled={deletingId === report.id}
                          className="btn btn-ghost btn-sm"
                        >
                          Delete
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
