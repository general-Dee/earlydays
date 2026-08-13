"use client";

import { useState } from "react";

export default function PortalLoginForm() {
  const [submitted, setSubmitted] = useState(false);

  return (
    <div className="card p-8 md:p-9 shadow-[0_20px_50px_-30px_rgba(22,33,62,0.3)]">
      <h4 className="font-display text-xl mb-0.5">Parent Login</h4>
      <p className="text-[0.85rem] text-slate">Demo only — wire this up to your backend before launch.</p>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          setSubmitted(true);
        }}
      >
        <label htmlFor="pEmail" className="block text-[0.78rem] font-bold text-slate mt-4 mb-1.5">
          Email or phone number
        </label>
        <input
          id="pEmail"
          type="text"
          placeholder="you@example.com"
          className="w-full px-3.5 py-3 rounded-lg border-[1.5px] border-line text-[0.94rem]"
        />

        <label htmlFor="pPass" className="block text-[0.78rem] font-bold text-slate mt-4 mb-1.5">
          Password
        </label>
        <input
          id="pPass"
          type="password"
          placeholder="••••••••"
          className="w-full px-3.5 py-3 rounded-lg border-[1.5px] border-line text-[0.94rem]"
        />

        <button type="submit" className="btn btn-primary w-full justify-center mt-5.5">
          Log In
        </button>
      </form>

      {submitted && (
        <div className="mt-3.5 px-3.5 py-3 rounded-lg bg-leaf-soft text-leaf text-[0.85rem] font-semibold">
          This is a UI demo. Connect authentication and student records before going live.
        </div>
      )}
    </div>
  );
}
