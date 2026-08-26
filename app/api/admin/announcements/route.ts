import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { requireAdminEmail } from "@/lib/firebase/admin-auth";
import { withRouteErrorHandling } from "@/lib/api/errors";

export const runtime = "nodejs";

const MAX_TITLE_LENGTH = 200;
const MAX_BODY_LENGTH = 2000;

export const GET = withRouteErrorHandling("GET /api/admin/announcements", async (req: NextRequest) => {
  const admin = await requireAdminEmail(req, "announcements");
  if (admin instanceof NextResponse) return admin;

  const snapshot = await getAdminDb().collection("announcements").orderBy("createdAt", "desc").get();
  const announcements = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

  return NextResponse.json({ announcements });
});

export const POST = withRouteErrorHandling("POST /api/admin/announcements", async (req: NextRequest) => {
  const admin = await requireAdminEmail(req, "announcements");
  if (admin instanceof NextResponse) return admin;

  const { title, body } = (await req.json()) as { title?: string; body?: string };

  const trimmedTitle = title?.trim() ?? "";
  const trimmedBody = body?.trim() ?? "";

  if (!trimmedTitle || !trimmedBody) {
    return NextResponse.json({ error: "Title and body are required" }, { status: 400 });
  }
  if (trimmedTitle.length > MAX_TITLE_LENGTH) {
    return NextResponse.json({ error: "Title is too long" }, { status: 400 });
  }
  if (trimmedBody.length > MAX_BODY_LENGTH) {
    return NextResponse.json({ error: "Body is too long" }, { status: 400 });
  }

  const announcement = {
    title: trimmedTitle,
    body: trimmedBody,
    createdBy: admin.email,
    createdAt: Date.now(),
  };

  const ref = await getAdminDb().collection("announcements").add(announcement);

  return NextResponse.json({ id: ref.id, ...announcement });
});
