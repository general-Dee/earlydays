"use client";

import { useState } from "react";
import {
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  type AuthError,
} from "firebase/auth";
import { getFirebaseAuth } from "@/lib/firebase/client";

function friendlyError(error: AuthError): string {
  switch (error.code) {
    case "auth/invalid-email":
      return "That email address doesn't look right.";
    case "auth/user-not-found":
    case "auth/wrong-password":
    case "auth/invalid-credential":
      return "Email or password is incorrect.";
    case "auth/too-many-requests":
      return "Too many attempts — please wait a moment and try again.";
    case "auth/user-disabled":
      return "This account has been deactivated. Contact the school office.";
    case "auth/network-request-failed":
      return "Network error — check your connection and try again.";
    default:
      return "Couldn't log you in. Please try again.";
  }
}

export default function PortalLoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [resetMessage, setResetMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResetMessage(null);
    setSubmitting(true);

    try {
      await signInWithEmailAndPassword(getFirebaseAuth(), email, password);
    } catch (err) {
      setError(friendlyError(err as AuthError));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleForgotPassword() {
    setError(null);
    setResetMessage(null);

    if (!email) {
      setError("Enter your email above first, then tap \"Forgot password\".");
      return;
    }

    try {
      await sendPasswordResetEmail(getFirebaseAuth(), email);
      setResetMessage("Password reset email sent — check your inbox.");
    } catch (err) {
      setError(friendlyError(err as AuthError));
    }
  }

  return (
    <div className="card p-8 md:p-9">
      <h4 className="font-display font-medium text-xl mb-0.5 text-ink">Parent Login</h4>
      <p className="text-[0.85rem] text-slate">Log in with the email and password the school issued you.</p>

      <form onSubmit={handleSubmit}>
        <label htmlFor="pEmail" className="block text-[0.78rem] font-medium text-slate mt-4 mb-1.5">
          Email
        </label>
        <input
          id="pEmail"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          autoComplete="email"
          required
          className="w-full px-3.5 py-3 rounded-lg border border-line bg-chalk text-ink text-[0.94rem]"
        />

        <label htmlFor="pPass" className="block text-[0.78rem] font-medium text-slate mt-4 mb-1.5">
          Password
        </label>
        <input
          id="pPass"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          autoComplete="current-password"
          required
          className="w-full px-3.5 py-3 rounded-lg border border-line bg-chalk text-ink text-[0.94rem]"
        />

        <button type="button" onClick={handleForgotPassword} className="mt-2.5 text-[0.8rem] text-accent-light font-medium">
          Forgot password?
        </button>

        <button type="submit" disabled={submitting} className="btn btn-primary w-full justify-center mt-5.5 disabled:opacity-60">
          {submitting ? "Logging in…" : "Log In"}
        </button>
      </form>

      {error && (
        <div className="mt-3.5 px-3.5 py-3 rounded-lg bg-clay-soft text-clay text-[0.85rem] font-semibold">
          {error}
        </div>
      )}

      {resetMessage && (
        <div className="mt-3.5 px-3.5 py-3 rounded-lg bg-leaf-soft text-leaf text-[0.85rem] font-semibold">
          {resetMessage}
        </div>
      )}
    </div>
  );
}
