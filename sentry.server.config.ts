import * as Sentry from "@sentry/nextjs";
import { redact } from "@/lib/redact";

// No DSN configured yet — Sentry.init() with an empty dsn makes the SDK a
// silent no-op (it never sends anywhere), so this is safe to ship ahead of
// creating a Sentry project. Set NEXT_PUBLIC_SENTRY_DSN to start reporting.
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
