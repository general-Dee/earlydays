import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth, getAdminDb } from "@/lib/firebase/admin";
import { withRouteErrorHandling } from "@/lib/api/errors";
import { COLLECTIONS } from "@/lib/firebase/collections";
import { ADMIN_AREAS, type AdminArea, type AdminUser } from "@/lib/firebase/types";

export type { AdminArea };

export type AdminIdentity = { uid: string; email: string; isSuperAdmin: boolean; areas: AdminArea[] };

function parseEmailList(raw: string | undefined): string[] {
  return (raw ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

function isEnvAdminEmail(email: string): boolean {
  return parseEmailList(process.env.ADMIN_EMAILS).includes(email.trim().toLowerCase());
}

function isEnvAreaAdminEmail(email: string, area: AdminArea): boolean {
  const areaVar = `ADMIN_EMAILS_${area.toUpperCase()}`;
  return parseEmailList(process.env[areaVar]).includes(email.trim().toLowerCase());
}

async function verifyBearerToken(
  req: NextRequest
): Promise<{ uid: string; email?: string } | NextResponse> {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Missing Authorization header" }, { status: 401 });
  }

  try {
    const decoded = await getAdminAuth().verifyIdToken(authHeader.slice("Bearer ".length));
    return { uid: decoded.uid, email: decoded.email };
  } catch {
    return NextResponse.json({ error: "Invalid or expired session" }, { status: 401 });
  }
}

// The `adminUsers` Firestore doc (keyed by uid) is the source of truth for
// who can manage what. When a user has no doc there yet, we fall back to the
// ADMIN_EMAILS / ADMIN_EMAILS_<AREA> env vars, treating a match as an
// implicit superadmin — this is both the bootstrap path for the very first
// admin and a permanent break-glass fallback that doesn't require a
// migration script.
async function resolveAdminIdentity(uid: string, email: string | undefined): Promise<AdminIdentity | null> {
  if (!email) return null;

  const doc = await getAdminDb().collection(COLLECTIONS.adminUsers).doc(uid).get();
  if (doc.exists) {
    const data = doc.data() as AdminUser;
    const disabled = (await getAdminAuth().getUser(uid)).disabled;
    if (disabled) return null;
    return { uid, email, isSuperAdmin: data.isSuperAdmin, areas: data.areas ?? [] };
  }

  if (isEnvAdminEmail(email)) {
    return { uid, email, isSuperAdmin: true, areas: [] };
  }

  const areas = ADMIN_AREAS.filter((area) => isEnvAreaAdminEmail(email, area));

  if (areas.length === 0) return null;
  return { uid, email, isSuperAdmin: false, areas };
}

export async function requireAdminEmail(
  req: NextRequest,
  area: AdminArea
): Promise<{ email: string } | NextResponse> {
  const result = await verifyBearerToken(req);
  if (result instanceof NextResponse) return result;

  const identity = await resolveAdminIdentity(result.uid, result.email);
  if (!identity || !(identity.isSuperAdmin || identity.areas.includes(area))) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  return { email: identity.email };
}

export async function requireSuperAdmin(
  req: NextRequest
): Promise<AdminIdentity | NextResponse> {
  const result = await verifyBearerToken(req);
  if (result instanceof NextResponse) return result;

  const identity = await resolveAdminIdentity(result.uid, result.email);
  if (!identity || !identity.isSuperAdmin) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  return identity;
}

export async function getAdminIdentity(req: NextRequest): Promise<AdminIdentity | NextResponse> {
  const result = await verifyBearerToken(req);
  if (result instanceof NextResponse) return result;

  const identity = await resolveAdminIdentity(result.uid, result.email);
  if (!identity) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  return identity;
}

export async function requireAuthenticatedUser(
  req: NextRequest
): Promise<{ uid: string } | NextResponse> {
  const result = await verifyBearerToken(req);
  if (result instanceof NextResponse) return result;
  return { uid: result.uid };
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

export function withSuperAdminRoute<C = undefined>(
  route: string,
  handler: (req: NextRequest, admin: AdminIdentity, context: C) => Promise<NextResponse>
) {
  return withRouteErrorHandling<C>(route, async (req, context) => {
    const admin = await requireSuperAdmin(req);
    if (admin instanceof NextResponse) return admin;
    return handler(req, admin, context as C);
  });
}

export function withAuthenticatedRoute<C = undefined>(
  route: string,
  handler: (req: NextRequest, user: { uid: string }, context: C) => Promise<NextResponse>
) {
  return withRouteErrorHandling<C>(route, async (req, context) => {
    const user = await requireAuthenticatedUser(req);
    if (user instanceof NextResponse) return user;
    return handler(req, user, context as C);
  });
}
