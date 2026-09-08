import { getAdminDb } from "@/lib/firebase/admin";
import { COLLECTIONS } from "@/lib/firebase/collections";
import { logRouteError } from "@/lib/api/errors";
import type { CronJobName, CronRunRecord } from "@/lib/firebase/types";

type RecordCronRunInput = {
  job: CronJobName;
  counts: Record<string, number>;
  failures: number;
};

// Best-effort: a failed write here must never mask the cron run's own error
// or throw out of the route handler, same reasoning as lib/audit.ts.
export async function recordCronRun(input: RecordCronRunInput): Promise<void> {
  try {
    const ref = getAdminDb().collection(COLLECTIONS.cronRuns).doc();
    const entry: CronRunRecord = {
      id: ref.id,
      job: input.job,
      createdAt: Date.now(),
      counts: input.counts,
      failures: input.failures,
    };
    await ref.set(entry);
  } catch (err) {
    logRouteError("recordCronRun", `failed to write cron run record for job "${input.job}"`, err);
  }
}
