// Static bracket definitions — labels/age ranges/which stage codes share a
// price, and the default price before an admin ever sets one. The actual
// live prices are admin-editable and Firestore-backed (see lib/feeSettings.ts).
export type FeeBracket = {
  id: string;
  label: string;
  ageRange: string;
  stageCodes: string[];
  defaultAmountKobo: number;
};

export const FEE_BRACKETS: FeeBracket[] = [
  { id: "creche", label: "Creche", ageRange: "3–12 months", stageCodes: ["CR"], defaultAmountKobo: 45_000_00 },
  { id: "pre-nursery", label: "Pre-Nursery", ageRange: "1–2 yrs", stageCodes: ["PN"], defaultAmountKobo: 50_000_00 },
  { id: "nursery", label: "Nursery 1–2", ageRange: "3–4 yrs", stageCodes: ["N1", "N2"], defaultAmountKobo: 60_000_00 },
  {
    id: "primary-junior",
    label: "Primary 1–3",
    ageRange: "5–7 yrs",
    stageCodes: ["P1", "P2", "P3"],
    defaultAmountKobo: 75_000_00,
  },
  {
    id: "primary-senior",
    label: "Primary 4–6",
    ageRange: "8–10 yrs",
    stageCodes: ["P4", "P5", "P6"],
    defaultAmountKobo: 85_000_00,
  },
];
