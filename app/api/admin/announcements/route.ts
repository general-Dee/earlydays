import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { withAdminRoute } from "@/lib/firebase/admin-auth";
import { validateRequiredString } from "@/lib/validation";

export const runtime = "nodejs";

const MAX_TITLE_LENGTH = 200;
const MAX_BODY_LENGTH = 2000;

export const GET = withAdminRoute("announcements", "GET /api/admin/announcements", async (req: NextRequest, admin) => {
  const snapshot = await getAdminDb().collection("announcements").orderBy("createdAt", "desc").get();
  const announcements = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

  return NextResponse.json({ announcements });
});

export const POST = withAdminRoute("announcements", "POST /api/admin/announcements", async (req: NextRequest, admin) => {
  const { title, body } = (await req.json()) as { title?: string; body?: string };

  const titleResult = validateRequiredString(title, { label: "Title", maxLength: MAX_TITLE_LENGTH });
  if (!titleResult.ok) return NextResponse.json({ error: titleResult.error }, { status: 400 });

  const bodyResult = validateRequiredString(body, { label: "Body", maxLength: MAX_BODY_LENGTH });
  if (!bodyResult.ok) return NextResponse.json({ error: bodyResult.error }, { status: 400 });

  const announcement = {
    title: titleResult.value,
    body: bodyResult.value,
    createdBy: admin.email,
    createdAt: Date.now(),
  };

  const ref = await getAdminDb().collection("announcements").add(announcement);

  return NextResponse.json({ id: ref.id, ...announcement });
});
