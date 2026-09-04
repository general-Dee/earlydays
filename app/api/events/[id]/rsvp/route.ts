import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { sendRsvpNotification } from "@/lib/email/notify";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { logRouteError, withRouteErrorHandling } from "@/lib/api/errors";
import { COLLECTIONS, paths } from "@/lib/firebase/collections";
import type { CalendarEvent, EventRsvp } from "@/lib/firebase/types";

export const runtime = "nodejs";

const MAX_NAME_LENGTH = 100;
const MAX_PHONE_LENGTH = 30;

export const POST = withRouteErrorHandling<{ params: { id: string } }>(
  "POST /api/events/[id]/rsvp",
  async (req: NextRequest, { params }) => {
    const ip = getClientIp(req);
    if (!(await checkRateLimit(`rsvp:${ip}`, { max: 5, windowMs: 10 * 60 * 1000 }))) {
      return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 });
    }

    const eventRef = getAdminDb().collection(COLLECTIONS.events).doc(params.id);
    const eventSnap = await eventRef.get();
    if (!eventSnap.exists) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }
    const event = eventSnap.data() as CalendarEvent;

    const { name, email, phone, guestCount, hp } = (await req.json()) as {
      name?: string;
      email?: string;
      phone?: string;
      guestCount?: number;
      hp?: string;
    };

    // Honeypot: real visitors never fill this hidden field.
    if (hp) {
      return NextResponse.json({ ok: true });
    }

    const trimmedName = name?.trim().slice(0, MAX_NAME_LENGTH) ?? "";
    const trimmedEmail = email?.trim().toLowerCase() ?? "";
    const trimmedPhone = phone?.trim().slice(0, MAX_PHONE_LENGTH) ?? "";
    const guests = typeof guestCount === "number" && Number.isFinite(guestCount) ? Math.max(1, Math.round(guestCount)) : 1;

    if (!trimmedName || !trimmedEmail) {
      return NextResponse.json({ error: "Name and email are required" }, { status: 400 });
    }

    const rsvpRef = getAdminDb().collection(paths.eventRsvps(params.id)).doc();
    const rsvp: EventRsvp = {
      id: rsvpRef.id,
      name: trimmedName,
      email: trimmedEmail,
      ...(trimmedPhone ? { phone: trimmedPhone } : {}),
      guestCount: guests,
      createdAt: Date.now(),
    };

    await rsvpRef.set(rsvp);

    try {
      await sendRsvpNotification(event.title, rsvp);
    } catch (err) {
      logRouteError("POST /api/events/[id]/rsvp", "failed to send RSVP notification email", err);
    }

    return NextResponse.json({ ok: true });
  }
);
