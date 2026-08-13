import { fees } from "@/lib/data";

export default function FeesTable() {
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
        {fees.map((f, i) => (
          <tr key={f.stage}>
            <td className={`px-4.5 py-4 text-sm ${i < fees.length - 1 ? "border-b border-line" : ""}`}>{f.stage}</td>
            <td className={`px-4.5 py-4 text-sm ${i < fees.length - 1 ? "border-b border-line" : ""}`}>{f.age}</td>
            <td className={`px-4.5 py-4 text-sm font-bold text-ink ${i < fees.length - 1 ? "border-b border-line" : ""}`}>₦{f.amount}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
