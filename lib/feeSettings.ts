import { getAdminDb } from "@/lib/firebase/admin";
import { COLLECTIONS } from "@/lib/firebase/collections";
import { FEE_BRACKETS } from "@/lib/fees";

export type FeeAmounts = Record<string, number>; // bracket id -> kobo

export function defaultFeeAmounts(): FeeAmounts {
  return Object.fromEntries(FEE_BRACKETS.map((bracket) => [bracket.id, bracket.defaultAmountKobo]));
}

export async function getFeeAmounts(): Promise<FeeAmounts> {
  const snap = await getAdminDb().collection(COLLECTIONS.settings).doc("fees").get();
  const stored = snap.exists ? (snap.data()!.amountsKobo as FeeAmounts) : {};
  return { ...defaultFeeAmounts(), ...stored };
}

export async function setFeeAmounts(amountsKobo: FeeAmounts, updatedBy: string): Promise<void> {
  await getAdminDb()
    .collection(COLLECTIONS.settings)
    .doc("fees")
    .set({ amountsKobo, updatedAt: Date.now(), updatedBy }, { merge: true });
}

// Expands bracket-level amounts into a per-stage-code lookup, for callers
// (Paystack charge amount, cron fee reminders) that only know a child's
// individual stage code, not which bracket it belongs to.
export function feeKoboByStageCode(amounts: FeeAmounts): Record<string, number> {
  const map: Record<string, number> = {};
  for (const bracket of FEE_BRACKETS) {
    for (const code of bracket.stageCodes) {
      map[code] = amounts[bracket.id];
    }
  }
  return map;
}

export async function getFeeKobo(stageCode: string): Promise<number> {
  const amounts = await getFeeAmounts();
  const amount = feeKoboByStageCode(amounts)[stageCode];
  if (!amount) {
    throw new Error(`No fee configured for stage "${stageCode}"`);
  }
  return amount;
}
