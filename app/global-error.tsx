"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

// app/error.tsx only catches errors below the root layout — this is
// Sentry's recommended addition to also catch errors thrown by the root
// layout itself, which replaces <html>/<body> entirely when it activates.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, sans-serif", textAlign: "center", padding: "4rem 1.5rem" }}>
        <h1 style={{ fontSize: "1.5rem", marginBottom: "0.75rem" }}>Something went wrong</h1>
        <p style={{ color: "#555", marginBottom: "1.5rem" }}>
          Try again, or reach us on WhatsApp if this keeps happening.
        </p>
        <button
          onClick={() => reset()}
          style={{ padding: "0.5rem 1.25rem", borderRadius: "9999px", border: "1px solid #ccc", cursor: "pointer" }}
        >
          Try Again
        </button>
      </body>
    </html>
  );
}
