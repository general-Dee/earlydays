function formatNaira(amountKobo: number) {
  return `₦${(amountKobo / 100).toLocaleString("en-NG")}`;
}

export type TermBreakdownEntry = {
  term: string;
  amountCollectedKobo: number;
  amountExpectedKobo: number;
};

export default function AdminFeeChart({ data }: { data: TermBreakdownEntry[] }) {
  return (
    <div className="flex flex-col gap-2.5">
      {data.map((entry) => {
        const hasExpected = entry.amountExpectedKobo > 0;
        const rate = hasExpected ? entry.amountCollectedKobo / entry.amountExpectedKobo : 0;
        // Clamp only the visual fill for overpayment/duplicate-record cases — the
        // displayed percentage below stays true so the anomaly remains visible.
        const fillPct = Math.min(rate, 1) * 100;

        return (
          <div key={entry.term} className="flex items-center gap-3">
            <span className="text-[0.75rem] text-slate w-16 shrink-0">{entry.term}</span>
            <div
              role="progressbar"
              aria-label={`${entry.term} collection rate`}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={hasExpected ? Math.round(rate * 100) : 0}
              aria-valuetext={
                hasExpected
                  ? `${formatNaira(entry.amountCollectedKobo)} of ${formatNaira(entry.amountExpectedKobo)}, ${Math.round(rate * 100)}%`
                  : "No fees due"
              }
              className="relative h-2.5 flex-1 rounded-full bg-ground-card overflow-hidden"
            >
              {hasExpected && (
                <div className="h-full rounded-full bg-leaf transition-[width]" style={{ width: `${fillPct}%` }} />
              )}
            </div>
            <span className="text-[0.75rem] font-display font-semibold text-ink w-24 text-right shrink-0">
              {hasExpected ? `${Math.round(rate * 100)}%` : "No fees due"}
            </span>
          </div>
        );
      })}
    </div>
  );
}
