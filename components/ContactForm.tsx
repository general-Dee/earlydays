"use client";

import { useState } from "react";

type Status = "idle" | "submitting" | "success" | "error";

export default function ContactForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [hp, setHp] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("submitting");
    setError(null);

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, phone, message, hp }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong — please try again.");

      setStatus("success");
      setName("");
      setEmail("");
      setPhone("");
      setMessage("");
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Something went wrong — please try again.");
    }
  }

  if (status === "success") {
    return (
      <div className="card p-8 mt-6">
        <div className="px-3.5 py-3 rounded-lg bg-leaf-soft text-leaf text-[0.85rem] font-semibold">
          Thanks — we&rsquo;ll get back to you within a school day.
        </div>
      </div>
    );
  }

  return (
    <div className="card p-8 mt-6">
      <h4 className="font-display text-xl mb-0.5">Send an inquiry</h4>
      <p className="text-[0.85rem] text-slate">Prefer not to switch apps? Send us a message here instead.</p>

      <form onSubmit={handleSubmit}>
        <label htmlFor="cName" className="block text-[0.78rem] font-bold text-slate mt-4 mb-1.5">
          Name
        </label>
        <input
          id="cName"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoComplete="name"
          required
          className="w-full px-3.5 py-3 rounded-lg border-[1.5px] border-line text-[0.94rem]"
        />

        <label htmlFor="cEmail" className="block text-[0.78rem] font-bold text-slate mt-4 mb-1.5">
          Email
        </label>
        <input
          id="cEmail"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          autoComplete="email"
          className="w-full px-3.5 py-3 rounded-lg border-[1.5px] border-line text-[0.94rem]"
        />

        <label htmlFor="cPhone" className="block text-[0.78rem] font-bold text-slate mt-4 mb-1.5">
          Phone
        </label>
        <input
          id="cPhone"
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          autoComplete="tel"
          className="w-full px-3.5 py-3 rounded-lg border-[1.5px] border-line text-[0.94rem]"
        />

        <label htmlFor="cMessage" className="block text-[0.78rem] font-bold text-slate mt-4 mb-1.5">
          Message
        </label>
        <textarea
          id="cMessage"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={4}
          required
          className="w-full px-3.5 py-3 rounded-lg border-[1.5px] border-line text-[0.94rem]"
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
          {status === "submitting" ? "Sending…" : "Send Message"}
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
