"use client";

import { useState } from "react";
import { stages } from "@/lib/data";
import type { ApplicationStatus } from "@/lib/firebase/types";

type Status = "idle" | "submitting" | "success" | "error";

type StatusResult = {
  status: ApplicationStatus;
  childName: string;
  desiredStage: string;
  submittedAt: number;
};

const statusStyle: Record<ApplicationStatus, string> = {
  new: "bg-sun-soft text-clay",
  reviewing: "bg-ground-card text-accent-light",
  accepted: "bg-leaf-soft text-leaf",
  waitlisted: "bg-chalk text-slate",
  declined: "bg-clay-soft text-clay",
};

const statusDescription: Record<ApplicationStatus, string> = {
  new: "Received — awaiting review.",
  reviewing: "Under review by our admissions team.",
  accepted: "Accepted! We'll be in touch about next steps.",
  waitlisted: "Waitlisted — we'll reach out if a place opens up.",
  declined: "We're unable to offer a place at this time.",
};

function stageLabel(code: string): string {
  return stages.find((s) => s.code === code)?.name ?? code;
}

export default function ApplicationStatusForm() {
  const [referenceCode, setReferenceCode] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<StatusResult | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("submitting");
    setError(null);

    try {
      const res = await fetch("/api/admissions/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ referenceCode }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong — please try again.");

      setResult(data as StatusResult);
      setStatus("success");
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Something went wrong — please try again.");
    }
  }

  if (status === "success" && result) {
    return (
      <div className="card p-8">
        <div className="flex items-center gap-2.5 mb-3.5">
          <span className={`text-[0.7rem] font-bold px-2.5 py-1 rounded-full ${statusStyle[result.status]}`}>
            {result.status}
          </span>
        </div>
        <p className="text-[0.94rem] text-ink font-semibold mb-1">
          {result.childName} — {stageLabel(result.desiredStage)}
        </p>
        <p className="text-[0.85rem] text-slate">{statusDescription[result.status]}</p>
        <button
          onClick={() => {
            setStatus("idle");
            setResult(null);
            setReferenceCode("");
          }}
          className="btn btn-ghost btn-sm mt-4"
        >
          Check another application
        </button>
      </div>
    );
  }

  return (
    <div className="card p-8">
      <h4 className="font-display font-medium text-xl mb-0.5 text-ink">Check your status</h4>
      <p className="text-[0.85rem] text-slate">
        Enter the reference code you received when you applied.
      </p>

      <form onSubmit={handleSubmit}>
        <label htmlFor="sReferenceCode" className="block text-[0.78rem] font-medium text-slate mt-4 mb-1.5">
          Reference code
        </label>
        <input
          id="sReferenceCode"
          type="text"
          value={referenceCode}
          onChange={(e) => setReferenceCode(e.target.value)}
          placeholder="e.g. A1B2C3D4"
          autoComplete="off"
          required
          className="w-full px-3.5 py-3 rounded-lg border border-line bg-chalk text-ink text-[0.94rem] uppercase tracking-wider"
        />

        <button
          type="submit"
          disabled={status === "submitting"}
          className="btn btn-primary w-full justify-center mt-5.5 disabled:opacity-60"
        >
          {status === "submitting" ? "Checking…" : "Check Status"}
        </button>
      </form>

      {error && (
        <div className="mt-3.5 px-3.5 py-3 rounded-lg bg-clay-soft text-clay text-[0.85rem] font-semibold">
          {error}
        </div>
      )}
    </div>
  );
}
