"use client";

import { useEffect, useState } from "react";
import { collection, getDocs, orderBy, query } from "firebase/firestore";
import { getDownloadURL, ref } from "firebase/storage";
import { getFirebaseDb, getFirebaseStorage } from "@/lib/firebase/client";
import type { ProgressReport } from "@/lib/firebase/types";

type LoadState = "loading" | "error" | "ready";

export default function PortalReportsWidget({ uid }: { uid: string }) {
  const [reports, setReports] = useState<ProgressReport[]>([]);
  const [state, setState] = useState<LoadState>("loading");
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setState("loading");
      try {
        const snap = await getDocs(
          query(collection(getFirebaseDb(), "parents", uid, "reports"), orderBy("createdAt", "desc"))
        );

        if (cancelled) return;

        setReports(snap.docs.map((d) => d.data() as ProgressReport));
        setState("ready");
      } catch {
        if (!cancelled) setState("error");
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [uid]);

  async function download(report: ProgressReport) {
    setDownloadingId(report.id);
    try {
      const url = await getDownloadURL(ref(getFirebaseStorage(), report.storagePath));
      window.open(url, "_blank", "noopener,noreferrer");
    } catch {
      // Swallow — the button just won't open anything if this fails.
    } finally {
      setDownloadingId(null);
    }
  }

  return (
    <div className="mt-6">
      <h5 className="text-[0.78rem] font-medium text-slate uppercase tracking-wider mb-2.5">Progress Reports</h5>

      {state === "loading" && <p className="text-sm text-slate">Loading reports…</p>}

      {state === "error" && (
        <div className="px-3.5 py-3 rounded-lg bg-clay-soft text-clay text-[0.85rem] font-semibold">
          Couldn&rsquo;t load progress reports. Please try again.
        </div>
      )}

      {state === "ready" && reports.length === 0 && (
        <p className="text-sm text-slate">No progress reports yet.</p>
      )}

      {state === "ready" && reports.length > 0 && (
        <ul className="flex flex-col gap-2">
          {reports.map((report) => (
            <li key={report.id} className="flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-lg bg-chalk">
              <span className="text-sm font-semibold">
                {report.childName} — {report.term}
              </span>
              <button
                onClick={() => download(report)}
                disabled={downloadingId === report.id}
                className="btn btn-ghost btn-sm"
              >
                {downloadingId === report.id ? "Opening…" : "Download"}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
