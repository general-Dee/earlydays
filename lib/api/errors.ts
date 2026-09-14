import { NextRequest, NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { redact } from "@/lib/redact";

type RouteErrorOptions = { status?: number; message?: string };

// Logs only an error's name/message (message redacted for email/phone-shaped
// substrings), never arbitrary extra properties a caller might have attached
// — those can carry request payloads with parent/child PII. The stack is
// passed through as-is: it's source file/line locations, not user data.
function safeLogError(err: unknown): { name?: string; message: string; stack?: string } {
  if (err instanceof Error) {
    return {
      name: err.name,
      message: redact(err.message),
      stack: err.stack,
    };
  }
  return { message: redact(String(err)) };
}

export function logRouteError(route: string, message: string, err: unknown): void {
  console.error(`[api] ${route} ${message}`, safeLogError(err));
  // No-ops until NEXT_PUBLIC_SENTRY_DSN is set; the beforeSend hooks in
  // sentry.server.config.ts / sentry.edge.config.ts redact PII before this
  // is actually sent anywhere.
  Sentry.captureException(err, { tags: { route }, extra: { message } });
}

export function handleRouteError(err: unknown, route: string, options: RouteErrorOptions = {}): NextResponse {
  console.error(`[api] ${route} failed`, safeLogError(err));
  Sentry.captureException(err, { tags: { route } });
  return NextResponse.json(
    { error: options.message ?? "Something went wrong. Please try again." },
    { status: options.status ?? 500 }
  );
}

export function withRouteErrorHandling<C = undefined>(
  route: string,
  handler: (req: NextRequest, context: C) => Promise<NextResponse>
) {
  return async (req: NextRequest, context?: C): Promise<NextResponse> => {
    try {
      return await handler(req, context as C);
    } catch (err) {
      return handleRouteError(err, route);
    }
  };
}
