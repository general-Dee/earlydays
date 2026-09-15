import { getAdminDb } from "@/lib/firebase/admin";
import { COLLECTIONS } from "@/lib/firebase/collections";
import { logRouteError } from "@/lib/api/errors";
import { redact } from "@/lib/redact";
import type { CronJobName, NotificationChannel, NotificationFailure } from "@/lib/firebase/types";

type RecordNotificationFailureInput = {
  job: CronJobName;
  channel: NotificationChannel;
  recipientUid?: string;
  recipientLabel: string;
  reason: string;
};

// Best-effort: a failed write here must never mask the cron run's own error
// or throw out of the route handler, same reasoning as lib/cronRuns.ts.
export async function recordNotificationFailure(input: RecordNotificationFailureInput): Promise<void> {
  try {
    const ref = getAdminDb().collection(COLLECTIONS.notificationFailures).doc();
    const entry: NotificationFailure = {
      id: ref.id,
      job: input.job,
      channel: input.channel,
      recipientLabel: input.recipientLabel,
      reason: redact(input.reason),
      createdAt: Date.now(),
      ...(input.recipientUid ? { recipientUid: input.recipientUid } : {}),
    };
    await ref.set(entry);
  } catch (err) {
    logRouteError("recordNotificationFailure", `failed to write notification failure record for job "${input.job}"`, err);
  }
}
