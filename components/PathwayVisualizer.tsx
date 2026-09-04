"use client";

import { useState } from "react";
import { stages } from "@/lib/data";

export default function PathwayVisualizer() {
  const [active, setActive] = useState(0);
  const stage = stages[active];

  return (
    <div>
      <div className="relative flex overflow-x-auto gap-0 pb-5 mt-14">
        <div
          className="absolute left-0 right-0 top-[38px] h-[2px] z-0"
          style={{
            background:
              "repeating-linear-gradient(90deg, rgba(233,233,237,0.16) 0 10px, transparent 10px 18px)",
          }}
        />
        {stages.map((s, i) => (
          <button
            key={s.code}
            onClick={() => setActive(i)}
            className="relative z-10 min-w-[150px] flex-1 flex flex-col items-center text-center px-2.5"
          >
            <div
              className={`w-[76px] h-[76px] rounded-full flex items-center justify-center font-mono font-medium text-sm mb-3.5 border transition-colors ${
                i === active
                  ? "bg-sun/[0.16] border-sun text-accent-light"
                  : "bg-transparent border-line text-ink"
              }`}
            >
              {s.code}
            </div>
            <span className="text-[0.76rem] text-ink/[0.6]">{s.age}</span>
            <span className={`font-medium text-[0.92rem] mt-0.5 ${i === active ? "text-sun" : "text-ink"}`}>
              {s.name}
            </span>
          </button>
        ))}
      </div>

      <div className="mt-11 bg-ground-card border border-line rounded-card p-8 md:p-9 flex flex-col md:flex-row gap-8 md:gap-9">
        <div className="flex-1">
          <span className="font-mono text-[0.7rem] text-accent-light uppercase tracking-[0.08em] mb-2.5 block">
            {stage.tag} · Age {stage.age}
          </span>
          <h2 className="font-display font-medium text-ink text-2xl mb-2">{stage.name}</h2>
          <p className="text-ink/[0.78]">{stage.desc}</p>
        </div>
        <ul className="flex-1 mt-3 pl-4.5 text-ink/[0.78] text-[0.92rem] space-y-1.5 list-disc">
          {stage.points.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
