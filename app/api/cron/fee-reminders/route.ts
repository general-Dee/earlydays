import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { sendFeeReminderEmail } from "@/lib/email/notify";
import { CURRENT_TERM } from "@/lib/fees";
import type { Parent, PaymentRecord } from "@/lib/firebase/types";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getAdminDb();
  const parentsSnap = await db.collection("parents").get();

  let remindersSent = 0;

  for (const parentDoc of parentsSnap.docs) {
    const parent = parentDoc.data() as Parent;
    const paymentsSnap = await db.collection(`parents/${parentDoc.id}/payments`).get();
    const payments = paymentsSnap.docs.map((d) => d.data() as PaymentRecord);

    const unpaidChildren = parent.children.filter(
      (child) =>
        !payments.some(
          (p) => p.childId === child.id && p.term === CURRENT_TERM && p.status === "success"
        )
    );

    if (unpaidChildren.length > 0) {
      try {
        const sent = await sendFeeReminderEmail(
          { guardianName: parent.guardianName, email: parent.email },
          unpaidChildren.map((c) => ({ name: c.name, stage: c.stage })),
          CURRENT_TERM
        );
        if (sent) remindersSent++;
      } catch (err) {
        console.error("Failed to send fee reminder email", err);
      }
    }
  }

  return NextResponse.json({ ok: true, remindersSent });
}
