"use client";

import { useState } from "react";
import { track } from "@vercel/analytics";

type Status = "idle" | "submitting" | "success" | "error";

export default function NewsletterSignupForm() {
  const [email, setEmail] = useState("");
  const [hp, setHp] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("submitting");
    setError(null);

    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, hp }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong — please try again.");

      track("newsletter_signup");
      setStatus("success");
      setEmail("");
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Something went wrong — please try again.");
    }
  }

  if (status === "success") {
    return <p className="text-sm text-leaf font-semibold">Thanks — you&rsquo;re on the list.</p>;
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row items-start sm:items-center gap-2.5">
      <label htmlFor="newsletterEmail" className="sr-only">
        Email address
      </label>
      <input
        id="newsletterEmail"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@example.com"
        autoComplete="email"
        required
        className="w-full sm:w-64 px-3.5 py-2.5 rounded-lg border border-line bg-chalk text-ink text-[0.9rem]"
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
        className="btn btn-primary btn-sm whitespace-nowrap disabled:opacity-60"
      >
        {status === "submitting" ? "Signing up…" : "Sign up"}
      </button>

      {error && <p className="text-xs text-clay">{error}</p>}
    </form>
  );
}
