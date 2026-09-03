import { NextRequest, NextResponse } from "next/server";
import { getAdminIdentity } from "@/lib/firebase/admin-auth";
import { withRouteErrorHandling } from "@/lib/api/errors";

export const runtime = "nodejs";

// Lets the client-side admin gate know up front which areas the signed-in
// user is actually authorized for, instead of discovering it one 403 at a
// time per panel.
export const GET = withRouteErrorHandling("GET /api/admin/me", async (req: NextRequest) => {
  const identity = await getAdminIdentity(req);
  if (identity instanceof NextResponse) return identity;

  return NextResponse.json({ isSuperAdmin: identity.isSuperAdmin, areas: identity.areas });
});
