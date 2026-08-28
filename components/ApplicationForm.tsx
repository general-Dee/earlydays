"use client";

import { useState } from "react";
import Link from "next/link";
import { track } from "@vercel/analytics";
import { stages } from "@/lib/data";

type Status = "idle" | "submitting" | "success" | "error";

export default function ApplicationForm() {
  const [childName, setChildName] = useState("");
  const [childDob, setChildDob] = useState("");
  const [desiredStage, setDesiredStage] = useState(stages[0].code);
  const [guardianName, setGuardianName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [hp, setHp] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [referenceCode, setReferenceCode] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!email.trim() && !phone.trim()) {
      setError("Provide an email or phone number so we can reply.");
      return;
    }

    setStatus("submitting");

    try {
      const res = await fetch("/api/admissions/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ childName, childDob, desiredStage, guardianName, email, phone, notes, hp }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong — please try again.");

      track("application_submitted");
      setStatus("success");
      setReferenceCode(data.referenceCode ?? null);
      setChildName("");
      setChildDob("");
      setDesiredStage(stages[0].code);
      setGuardianName("");
      setEmail("");
      setPhone("");
      setNotes("");
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Something went wrong — please try again.");
    }
  }

  if (status === "success") {
    return (
      <div className="card p-8">
        <div className="px-3.5 py-3 rounded-lg bg-leaf-soft text-leaf text-[0.85rem] font-semibold">
          Thanks — we&rsquo;ve received your application and will follow up within a school day.
        </div>
        {referenceCode && (
          <div className="mt-4">
            <p className="text-[0.85rem] text-slate mb-1.5">
              Save this reference code to check your application status later:
            </p>
            <code className="block px-3.5 py-3 rounded-lg bg-chalk text-ink text-lg font-semibold tracking-wider text-center">
              {referenceCode}
            </code>
            <Link href="/admissions/status" className="text-sm font-medium underline mt-2 inline-block">
              Check application status →
            </Link>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="card p-8">
      <h4 className="font-display font-medium text-xl mb-0.5 text-ink">Application details</h4>
      <p className="text-[0.85rem] text-slate">Takes about two minutes — we&rsquo;ll reach out to confirm next steps.</p>

      <form onSubmit={handleSubmit}>
        <label htmlFor="aChildName" className="block text-[0.78rem] font-medium text-slate mt-4 mb-1.5">
          Child&rsquo;s full name
        </label>
        <input
          id="aChildName"
          type="text"
          value={childName}
          onChange={(e) => setChildName(e.target.value)}
          required
          className="w-full px-3.5 py-3 rounded-lg border border-line bg-chalk text-ink text-[0.94rem]"
        />

        <label htmlFor="aChildDob" className="block text-[0.78rem] font-medium text-slate mt-4 mb-1.5">
          Child&rsquo;s date of birth
        </label>
        <input
          id="aChildDob"
          type="date"
          value={childDob}
          onChange={(e) => setChildDob(e.target.value)}
          required
          className="w-full px-3.5 py-3 rounded-lg border border-line bg-chalk text-ink text-[0.94rem]"
        />

        <label htmlFor="aStage" className="block text-[0.78rem] font-medium text-slate mt-4 mb-1.5">
          Desired stage
        </label>
        <select
          id="aStage"
          value={desiredStage}
          onChange={(e) => setDesiredStage(e.target.value)}
          required
          className="w-full px-3.5 py-3 rounded-lg border border-line bg-chalk text-ink text-[0.94rem]"
        >
          {stages.map((s) => (
            <option key={s.code} value={s.code}>
              {s.name} ({s.age})
            </option>
          ))}
        </select>

        <label htmlFor="aGuardianName" className="block text-[0.78rem] font-medium text-slate mt-4 mb-1.5">
          Parent/guardian full name
        </label>
        <input
          id="aGuardianName"
          type="text"
          value={guardianName}
          onChange={(e) => setGuardianName(e.target.value)}
          autoComplete="name"
          required
          className="w-full px-3.5 py-3 rounded-lg border border-line bg-chalk text-ink text-[0.94rem]"
        />

        <label htmlFor="aEmail" className="block text-[0.78rem] font-medium text-slate mt-4 mb-1.5">
          Email
        </label>
        <input
          id="aEmail"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          autoComplete="email"
          className="w-full px-3.5 py-3 rounded-lg border border-line bg-chalk text-ink text-[0.94rem]"
        />

        <label htmlFor="aPhone" className="block text-[0.78rem] font-medium text-slate mt-4 mb-1.5">
          Phone
        </label>
        <input
          id="aPhone"
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          autoComplete="tel"
          className="w-full px-3.5 py-3 rounded-lg border border-line bg-chalk text-ink text-[0.94rem]"
        />

        <label htmlFor="aNotes" className="block text-[0.78rem] font-medium text-slate mt-4 mb-1.5">
          Anything else we should know? (optional)
        </label>
        <textarea
          id="aNotes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={4}
          className="w-full px-3.5 py-3 rounded-lg border border-line bg-chalk text-ink text-[0.94rem]"
        />

        <input
          type="text"
          name="company"
          value={hp}
          onChange={(e) => setHp(e.target.value)}
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
          className="absolute -left-[9999px] w-px h-px overflow-hidden"
        />

        <button
          type="submit"
          disabled={status === "submitting"}
          className="btn btn-primary w-full justify-center mt-5.5 disabled:opacity-60"
        >
          {status === "submitting" ? "Submitting…" : "Submit Application"}
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
