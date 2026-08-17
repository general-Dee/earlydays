// Termly fees in kobo, keyed by Stage.code (see lib/data.ts). Mirrors the
// brackets shown in lib/data.ts `fees` — kept separate because that array
// groups stages for display, while payment needs one amount per stage code.
// Sample figures — replace with the confirmed fee schedule before launch.
export const FEE_BY_STAGE: Record<string, number> = {
  CR: 45_000_00,
  PN: 50_000_00,
  N1: 60_000_00,
  N2: 60_000_00,
  P1: 75_000_00,
  P2: 75_000_00,
  P3: 75_000_00,
  P4: 85_000_00,
  P5: 85_000_00,
  P6: 85_000_00,
};

export function getFeeKobo(stageCode: string): number {
  const amount = FEE_BY_STAGE[stageCode];
  if (!amount) {
    throw new Error(`No fee configured for stage "${stageCode}"`);
  }
  return amount;
}

// Update this at the start of each term — drives which term's payments the
// fee reminder cron checks for.
export const CURRENT_TERM = "Term 3";
