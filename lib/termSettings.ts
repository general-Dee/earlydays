import { getAdminDb } from "@/lib/firebase/admin";
import { COLLECTIONS } from "@/lib/firebase/collections";

// Update this once an admin has set a real current term via /admin — this
// is only the fallback for a fresh install before that's ever happened.
export const DEFAULT_TERM = "Term 1";

export async function getCurrentTerm(): Promise<string> {
  const snap = await getAdminDb().collection(COLLECTIONS.settings).doc("term").get();
  return snap.exists ? (snap.data()!.currentTerm as string) : DEFAULT_TERM;
}

export async function setCurrentTerm(currentTerm: string, updatedBy: string): Promise<void> {
  await getAdminDb()
    .collection(COLLECTIONS.settings)
    .doc("term")
    .set({ currentTerm, updatedAt: Date.now(), updatedBy }, { merge: true });
}
