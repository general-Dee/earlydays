import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { getAdminDb } from "@/lib/firebase/admin";
import { sendEventReminderEmail } from "@/lib/email/notify";
import { logRouteError, withRouteErrorHandling } from "@/lib/api/errors";
import { COLLECTIONS, paths } from "@/lib/firebase/collections";
import type { CalendarEvent, EventRsvp } from "@/lib/firebase/types";

export const runtime = "nodejs";

function tomorrowDateString(): string {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return tomorrow.toISOString().slice(0, 10);
}

export const GET = withRouteErrorHandling("GET /api/cron/event-reminders", async (req: NextRequest) => {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.get("authorization") ?? "";
  const expected = `Bearer ${cronSecret}`;
  const authorized =
    !!cronSecret && authHeader.length === expected.length && timingSafeEqual(Buffer.from(authHeader), Buffer.from(expected));

  if (!authorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getAdminDb();
  const tomorrow = tomorrowDateString();
  const eventsSnap = await db.collection(COLLECTIONS.events).where("date", "==", tomorrow).get();

  let eventsChecked = 0;
  let emailsSent = 0;

  for (const eventDoc of eventsSnap.docs) {
    eventsChecked++;
    const event = eventDoc.data() as CalendarEvent;
    const rsvpsSnap = await db.collection(paths.eventRsvps(eventDoc.id)).get();

    for (const rsvpDoc of rsvpsSnap.docs) {
      const rsvp = rsvpDoc.data() as EventRsvp;
      try {
        const sent = await sendEventReminderEmail(
          { name: rsvp.name, email: rsvp.email },
          { title: event.title, date: event.date, desc: event.desc }
        );
        if (sent) emailsSent++;
      } catch (err) {
        logRouteError("GET /api/cron/event-reminders", "failed to send event reminder email", err);
      }
    }
  }

  return NextResponse.json({ ok: true, eventsChecked, emailsSent });
});
