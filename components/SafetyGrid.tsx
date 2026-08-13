import { safetyPoints } from "@/lib/data";

export default function SafetyGrid() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
      {safetyPoints.map((s) => (
        <div key={s.title} className="card p-7">
          <div className="w-11 h-11 rounded-[10px] bg-leaf-soft text-leaf flex items-center justify-center mb-4 text-lg">
            {s.icon}
          </div>
          <h4 className="font-display text-base mb-1.5">{s.title}</h4>
          <p className="text-sm mb-0">{s.desc}</p>
        </div>
      ))}
    </div>
  );
}
