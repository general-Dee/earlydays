import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth, getAdminDb } from "@/lib/firebase/admin";

export const runtime = "nodejs";

function isAdminEmail(email: string | undefined): boolean {
  if (!email) return false;
  const allowed = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return allowed.includes(email.trim().toLowerCase());
}

export async function GET(req: NextRequest) {
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

  if (!isAdminEmail(email)) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const snapshot = await getAdminDb().collection("inquiries").orderBy("createdAt", "desc").get();
  const inquiries = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

  return NextResponse.json({ inquiries });
}
