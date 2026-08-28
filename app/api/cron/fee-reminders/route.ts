import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { sendFeeReminderEmail } from "@/lib/email/notify";
import { sendWhatsAppFeeReminder } from "@/lib/whatsapp";
import { sendSmsFeeReminder } from "@/lib/sms";
import { getCurrentTerm } from "@/lib/termSettings";
import { logRouteError, withRouteErrorHandling } from "@/lib/api/errors";
import { COLLECTIONS, paths } from "@/lib/firebase/collections";
import type { Parent, PaymentRecord } from "@/lib/firebase/types";

export const runtime = "nodejs";

export const GET = withRouteErrorHandling("GET /api/cron/fee-reminders", async (req: NextRequest) => {
  const authHeader = req.headers.get("authorization");
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getAdminDb();
  const CURRENT_TERM = await getCurrentTerm();
  const parentsSnap = await db.collection(COLLECTIONS.parents).get();

  let emailsSent = 0;
  let whatsappSent = 0;
  let smsSent = 0;

  for (const parentDoc of parentsSnap.docs) {
    const parent = parentDoc.data() as Parent;
    const paymentsSnap = await db.collection(paths.payments(parentDoc.id)).get();
    const payments = paymentsSnap.docs.map((d) => d.data() as PaymentRecord);

    const unpaidChildren = parent.children.filter(
      (child) =>
        !payments.some(
          (p) => p.childId === child.id && p.term === CURRENT_TERM && p.status === "success"
        )
    );

    if (unpaidChildren.length === 0) continue;

    const unpaidForNotify = unpaidChildren.map((c) => ({ name: c.name, stage: c.stage }));

    try {
      const sent = await sendFeeReminderEmail(
        { guardianName: parent.guardianName, email: parent.email },
        unpaidForNotify,
        CURRENT_TERM
      );
      if (sent) emailsSent++;
    } catch (err) {
      logRouteError("GET /api/cron/fee-reminders", "failed to send fee reminder email", err);
    }

    if (parent.phone) {
      try {
        const sent = await sendWhatsAppFeeReminder(
          { guardianName: parent.guardianName, phone: parent.phone },
          unpaidForNotify,
          CURRENT_TERM
        );
        if (sent) whatsappSent++;
      } catch (err) {
        logRouteError("GET /api/cron/fee-reminders", "failed to send fee reminder WhatsApp message", err);
      }

      try {
        const sent = await sendSmsFeeReminder(
          { guardianName: parent.guardianName, phone: parent.phone },
          unpaidForNotify,
          CURRENT_TERM
        );
        if (sent) smsSent++;
      } catch (err) {
        logRouteError("GET /api/cron/fee-reminders", "failed to send fee reminder SMS", err);
      }
    }
  }

  return NextResponse.json({ ok: true, emailsSent, whatsappSent, smsSent });
});
