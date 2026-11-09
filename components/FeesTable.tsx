import { FEE_BRACKETS } from "@/lib/fees";
import { getPublicFeeAmounts, type FeeAmounts } from "@/lib/feeSettings";
import { formatNaira } from "@/lib/currency";
import { logRouteError } from "@/lib/api/errors";

// Loads the fee amounts the public site may show (admin-saved only, unless
// SHOW_SAMPLE_CONTENT=true). A Firestore error degrades to "nothing to show"
// rather than failing the page.
export async function loadPublicFeeAmounts(): Promise<FeeAmounts | null> {
  try {
    return await getPublicFeeAmounts();
  } catch (err) {
    logRouteError("FeesTable", "failed to load live fee amounts, hiding the fees table", err);
    return null;
  }
}

export default async function FeesTable({ amounts: given }: { amounts?: FeeAmounts | null } = {}) {
  const amounts = given === undefined ? await loadPublicFeeAmounts() : given;
  if (!amounts) return null;

  const rows = FEE_BRACKETS.filter((bracket) => typeof amounts[bracket.id] === "number");
  if (!rows.length) return null;

  return (
    <table className="w-full border-collapse card overflow-hidden">
      <thead>
        <tr>
          <th className="text-left px-4.5 py-4 font-mono text-[0.7rem] uppercase tracking-wide text-slate bg-chalk border-b border-line">Stage</th>
          <th className="text-left px-4.5 py-4 font-mono text-[0.7rem] uppercase tracking-wide text-slate bg-chalk border-b border-line">Age</th>
          <th className="text-left px-4.5 py-4 font-mono text-[0.7rem] uppercase tracking-wide text-slate bg-chalk border-b border-line">Termly Fee (₦)</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((bracket, i) => (
          <tr key={bracket.id}>
            <td className={`px-4.5 py-4 text-sm ${i < rows.length - 1 ? "border-b border-line" : ""}`}>{bracket.label}</td>
            <td className={`px-4.5 py-4 text-sm ${i < rows.length - 1 ? "border-b border-line" : ""}`}>{bracket.ageRange}</td>
            <td className={`px-4.5 py-4 text-sm font-medium text-ink ${i < rows.length - 1 ? "border-b border-line" : ""}`}>
              {formatNaira(amounts[bracket.id])}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
