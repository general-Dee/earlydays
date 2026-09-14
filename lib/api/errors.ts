import { NextRequest, NextResponse } from "next/server";

type RouteErrorOptions = { status?: number; message?: string };

const EMAIL_PATTERN = /[^\s@]+@[^\s@]+\.[^\s@]+/g;
const PHONE_PATTERN = /\+?\d[\d\s-]{7,}\d/g;

function redact(text: string): string {
  return text.replace(EMAIL_PATTERN, "[redacted-email]").replace(PHONE_PATTERN, "[redacted-phone]");
}

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
}

export function handleRouteError(err: unknown, route: string, options: RouteErrorOptions = {}): NextResponse {
  console.error(`[api] ${route} failed`, safeLogError(err));
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
