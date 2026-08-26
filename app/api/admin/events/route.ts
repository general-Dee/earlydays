import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { withAdminRoute } from "@/lib/firebase/admin-auth";
import { validateRequiredString } from "@/lib/validation";

export const runtime = "nodejs";

const MAX_TITLE_LENGTH = 200;
const MAX_TAG_LENGTH = 60;
const MAX_DESC_LENGTH = 500;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export const GET = withAdminRoute("events", "GET /api/admin/events", async (req: NextRequest, admin) => {
  const snapshot = await getAdminDb().collection("events").orderBy("date", "asc").get();
  const events = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

  return NextResponse.json({ events });
});

export const POST = withAdminRoute("events", "POST /api/admin/events", async (req: NextRequest, admin) => {
  const { title, date, tag, desc } = (await req.json()) as {
    title?: string;
    date?: string;
    tag?: string;
    desc?: string;
  };

  const titleResult = validateRequiredString(title, { label: "Title", maxLength: MAX_TITLE_LENGTH });
  if (!titleResult.ok) return NextResponse.json({ error: titleResult.error }, { status: 400 });

  const dateResult = validateRequiredString(date, {
    label: "Date",
    maxLength: 20,
    pattern: { regex: DATE_PATTERN, message: "Date must be in YYYY-MM-DD format" },
  });
  if (!dateResult.ok) return NextResponse.json({ error: dateResult.error }, { status: 400 });

  const tagResult = validateRequiredString(tag, { label: "Tag", maxLength: MAX_TAG_LENGTH });
  if (!tagResult.ok) return NextResponse.json({ error: tagResult.error }, { status: 400 });

  const descResult = validateRequiredString(desc, { label: "Description", maxLength: MAX_DESC_LENGTH });
  if (!descResult.ok) return NextResponse.json({ error: descResult.error }, { status: 400 });

  const event = {
    title: titleResult.value,
    date: dateResult.value,
    tag: tagResult.value,
    desc: descResult.value,
    createdBy: admin.email,
    createdAt: Date.now(),
  };

  const ref = await getAdminDb().collection("events").add(event);

  return NextResponse.json({ id: ref.id, ...event });
});
