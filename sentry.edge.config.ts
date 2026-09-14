import * as Sentry from "@sentry/nextjs";
import { redact } from "@/lib/redact";

// This project doesn't currently run anything on the edge runtime (every
// route declares `export const runtime = "nodejs"`), but instrumentation.ts
// dynamically imports this file whenever NEXT_RUNTIME === "edge", so it's
// included for when that changes. Same no-op-without-a-DSN behavior as
// sentry.server.config.ts.
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.1,
  beforeSend(event) {
    for (const exception of event.exception?.values ?? []) {
      if (exception.value) exception.value = redact(exception.value);
    }
    if (event.message) event.message = redact(event.message);
    return event;
  },
});
