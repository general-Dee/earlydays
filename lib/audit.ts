import { getAdminDb } from "@/lib/firebase/admin";
import { COLLECTIONS } from "@/lib/firebase/collections";
import { logRouteError } from "@/lib/api/errors";
import type { AuditLogEntry } from "@/lib/firebase/types";

type LogAdminActionInput = {
  action: string;
  actorEmail: string;
  targetUid?: string;
  targetEmail?: string;
  detail?: string;
};

// Best-effort: a failed audit write should never fail the admin action it's
// logging, so this swallows and logs its own errors instead of throwing.
export async function logAdminAction(input: LogAdminActionInput): Promise<void> {
  try {
    const ref = getAdminDb().collection(COLLECTIONS.auditLog).doc();
    const entry: AuditLogEntry = {
      id: ref.id,
      action: input.action,
      actorEmail: input.actorEmail,
      createdAt: Date.now(),
      ...(input.targetUid ? { targetUid: input.targetUid } : {}),
      ...(input.targetEmail ? { targetEmail: input.targetEmail } : {}),
      ...(input.detail ? { detail: input.detail } : {}),
    };
    await ref.set(entry);
  } catch (err) {
    logRouteError("logAdminAction", `failed to write audit log entry for action "${input.action}"`, err);
  }
}
