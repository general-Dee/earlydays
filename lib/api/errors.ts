import { NextRequest, NextResponse } from "next/server";

type RouteErrorOptions = { status?: number; message?: string };

export function logRouteError(route: string, message: string, err: unknown): void {
  console.error(`[api] ${route} ${message}`, err);
}

export function handleRouteError(err: unknown, route: string, options: RouteErrorOptions = {}): NextResponse {
  console.error(`[api] ${route} failed`, err);
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
