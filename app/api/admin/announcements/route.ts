import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { withAdminRoute } from "@/lib/firebase/admin-auth";
import { COLLECTIONS } from "@/lib/firebase/collections";
import { validateRequiredString } from "@/lib/validation";
import { sendNewAnnouncementEmail } from "@/lib/email/notify";
import { logRouteError } from "@/lib/api/errors";
import type { Parent } from "@/lib/firebase/types";

export const runtime = "nodejs";

const MAX_TITLE_LENGTH = 200;
const MAX_BODY_LENGTH = 2000;

export const GET = withAdminRoute("announcements", "GET /api/admin/announcements", async (req: NextRequest, admin) => {
  const snapshot = await getAdminDb().collection(COLLECTIONS.announcements).orderBy("createdAt", "desc").get();
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

  const ref = await getAdminDb().collection(COLLECTIONS.announcements).add(announcement);

  const parentsSnap = await getAdminDb().collection(COLLECTIONS.parents).get();
  let emailsSent = 0;
  for (const parentDoc of parentsSnap.docs) {
    const parent = parentDoc.data() as Parent;
    try {
      const sent = await sendNewAnnouncementEmail(
        { guardianName: parent.guardianName, email: parent.email },
        { title: announcement.title, body: announcement.body }
      );
      if (sent) emailsSent++;
    } catch (err) {
      logRouteError("POST /api/admin/announcements", "failed to send new-announcement email", err);
    }
  }

  return NextResponse.json({ id: ref.id, ...announcement, emailsSent });
});
