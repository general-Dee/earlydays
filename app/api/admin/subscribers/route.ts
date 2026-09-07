import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { withAdminRoute } from "@/lib/firebase/admin-auth";
import { COLLECTIONS } from "@/lib/firebase/collections";
import { validateRequiredString } from "@/lib/validation";
import { sendNewsletterEmail } from "@/lib/email/notify";
import { logAdminAction } from "@/lib/audit";
import { logRouteError } from "@/lib/api/errors";
import type { Subscriber } from "@/lib/firebase/types";

export const runtime = "nodejs";

const MAX_SUBJECT_LENGTH = 200;
const MAX_BODY_LENGTH = 5000;

export const GET = withAdminRoute("subscribers", "GET /api/admin/subscribers", async (req: NextRequest, admin) => {
  const snapshot = await getAdminDb().collection(COLLECTIONS.subscribers).orderBy("createdAt", "desc").get();
  const subscribers = snapshot.docs.map((doc) => doc.data() as Subscriber);
  return NextResponse.json({ subscribers });
});

export const POST = withAdminRoute("subscribers", "POST /api/admin/subscribers", async (req: NextRequest, admin) => {
  const { subject, body } = (await req.json()) as { subject?: string; body?: string };

  const subjectResult = validateRequiredString(subject, { label: "Subject", maxLength: MAX_SUBJECT_LENGTH });
  if (!subjectResult.ok) return NextResponse.json({ error: subjectResult.error }, { status: 400 });

  const bodyResult = validateRequiredString(body, { label: "Body", maxLength: MAX_BODY_LENGTH });
  if (!bodyResult.ok) return NextResponse.json({ error: bodyResult.error }, { status: 400 });

  await logAdminAction({
    action: "newsletter.sent",
    actorEmail: admin.email,
    detail: subjectResult.value,
  });

  const subscribersSnap = await getAdminDb().collection(COLLECTIONS.subscribers).get();
  let emailsSent = 0;
  for (const subscriberDoc of subscribersSnap.docs) {
    const subscriber = subscriberDoc.data() as Subscriber;
    try {
      const sent = await sendNewsletterEmail(
        { email: subscriber.email, name: subscriber.name },
        { subject: subjectResult.value, body: bodyResult.value }
      );
      if (sent) emailsSent++;
    } catch (err) {
      logRouteError("POST /api/admin/subscribers", "failed to send newsletter email", err);
    }
  }

  return NextResponse.json({ emailsSent });
});
