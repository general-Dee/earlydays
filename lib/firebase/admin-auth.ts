import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth } from "@/lib/firebase/admin";
import { withRouteErrorHandling } from "@/lib/api/errors";

export type AdminArea = "announcements" | "applications" | "inquiries" | "parents" | "events" | "reports";

function parseEmailList(raw: string | undefined): string[] {
  return (raw ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

function isAdminEmail(email: string | undefined): boolean {
  if (!email) return false;
  return parseEmailList(process.env.ADMIN_EMAILS).includes(email.trim().toLowerCase());
}

function isAreaAdminEmail(email: string, area: AdminArea): boolean {
  const areaVar = `ADMIN_EMAILS_${area.toUpperCase()}`;
  return parseEmailList(process.env[areaVar]).includes(email.trim().toLowerCase());
}

export async function requireAdminEmail(
  req: NextRequest,
  area: AdminArea
): Promise<{ email: string } | NextResponse> {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Missing Authorization header" }, { status: 401 });
  }

  let email: string | undefined;
  try {
    const decoded = await getAdminAuth().verifyIdToken(authHeader.slice("Bearer ".length));
    email = decoded.email;
  } catch {
    return NextResponse.json({ error: "Invalid or expired session" }, { status: 401 });
  }

  if (!email || !(isAdminEmail(email) || isAreaAdminEmail(email, area))) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  return { email };
}

export function withAdminRoute<C = undefined>(
  area: AdminArea,
  route: string,
  handler: (req: NextRequest, admin: { email: string }, context: C) => Promise<NextResponse>
) {
  return withRouteErrorHandling<C>(route, async (req, context) => {
    const admin = await requireAdminEmail(req, area);
    if (admin instanceof NextResponse) return admin;
    return handler(req, admin, context as C);
  });
}
