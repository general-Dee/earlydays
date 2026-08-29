import { FEE_BRACKETS } from "@/lib/fees";
import { defaultFeeAmounts, getFeeAmounts } from "@/lib/feeSettings";

function formatNaira(amountKobo: number) {
  return (amountKobo / 100).toLocaleString("en-NG");
}

export default async function FeesTable() {
  // Unlike the payment/cron/admin paths, a public marketing page should
  // degrade to the default prices rather than fail to render if Firestore
  // is briefly unreachable (or, at build time, has no real credentials yet).
  let amounts;
  try {
    amounts = await getFeeAmounts();
  } catch (err) {
    console.error("FeesTable: failed to load live fee amounts, showing defaults", err);
    amounts = defaultFeeAmounts();
  }

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
        {FEE_BRACKETS.map((bracket, i) => (
          <tr key={bracket.id}>
            <td className={`px-4.5 py-4 text-sm ${i < FEE_BRACKETS.length - 1 ? "border-b border-line" : ""}`}>{bracket.label}</td>
            <td className={`px-4.5 py-4 text-sm ${i < FEE_BRACKETS.length - 1 ? "border-b border-line" : ""}`}>{bracket.ageRange}</td>
            <td className={`px-4.5 py-4 text-sm font-medium text-ink ${i < FEE_BRACKETS.length - 1 ? "border-b border-line" : ""}`}>
              ₦{formatNaira(amounts[bracket.id] ?? bracket.defaultAmountKobo)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
