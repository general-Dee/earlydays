import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { requireAdminEmail } from "@/lib/firebase/admin-auth";
import { withRouteErrorHandling } from "@/lib/api/errors";

export const runtime = "nodejs";

const MAX_TITLE_LENGTH = 200;
const MAX_TAG_LENGTH = 60;
const MAX_DESC_LENGTH = 500;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export const GET = withRouteErrorHandling("GET /api/admin/events", async (req: NextRequest) => {
  const admin = await requireAdminEmail(req, "events");
  if (admin instanceof NextResponse) return admin;

  const snapshot = await getAdminDb().collection("events").orderBy("date", "asc").get();
  const events = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

  return NextResponse.json({ events });
});

export const POST = withRouteErrorHandling("POST /api/admin/events", async (req: NextRequest) => {
  const admin = await requireAdminEmail(req, "events");
  if (admin instanceof NextResponse) return admin;

  const { title, date, tag, desc } = (await req.json()) as {
    title?: string;
    date?: string;
    tag?: string;
    desc?: string;
  };

  const trimmedTitle = title?.trim() ?? "";
  const trimmedDate = date?.trim() ?? "";
  const trimmedTag = tag?.trim() ?? "";
  const trimmedDesc = desc?.trim() ?? "";

  if (!trimmedTitle || !trimmedDate || !trimmedTag || !trimmedDesc) {
    return NextResponse.json({ error: "Title, date, tag, and description are required" }, { status: 400 });
  }
  if (!DATE_PATTERN.test(trimmedDate)) {
    return NextResponse.json({ error: "Date must be in YYYY-MM-DD format" }, { status: 400 });
  }
  if (trimmedTitle.length > MAX_TITLE_LENGTH) {
    return NextResponse.json({ error: "Title is too long" }, { status: 400 });
  }
  if (trimmedTag.length > MAX_TAG_LENGTH) {
    return NextResponse.json({ error: "Tag is too long" }, { status: 400 });
  }
  if (trimmedDesc.length > MAX_DESC_LENGTH) {
    return NextResponse.json({ error: "Description is too long" }, { status: 400 });
  }

  const event = {
    title: trimmedTitle,
    date: trimmedDate,
    tag: trimmedTag,
    desc: trimmedDesc,
    createdBy: admin.email,
    createdAt: Date.now(),
  };

  const ref = await getAdminDb().collection("events").add(event);

  return NextResponse.json({ id: ref.id, ...event });
});
