const EMAIL_PATTERN = /[^\s@]+@[^\s@]+\.[^\s@]+/g;
const PHONE_PATTERN = /\+?\d[\d\s-]{7,}\d/g;

// Zero-dependency by design so it's safe to import from client, server, and
// edge code alike (used by lib/api/errors.ts and the Sentry beforeSend
// hooks in sentry.*.config.ts / instrumentation-client.ts).
export function redact(text: string): string {
  return text.replace(EMAIL_PATTERN, "[redacted-email]").replace(PHONE_PATTERN, "[redacted-phone]");
}
