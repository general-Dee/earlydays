"use client";

import { useState } from "react";
import { stages } from "@/lib/data";

export default function PathwayVisualizer({ dark = true }: { dark?: boolean }) {
  const [active, setActive] = useState(0);
  const stage = stages[active];

  return (
    <div>
      <div className="relative flex overflow-x-auto gap-0 pb-5 mt-14">
        <div
          className="absolute left-0 right-0 top-[38px] h-[2px] z-0"
          style={{
            background:
              "repeating-linear-gradient(90deg, #3E4C72 0 10px, transparent 10px 18px)",
          }}
        />
        {stages.map((s, i) => (
          <button
            key={s.code}
            onClick={() => setActive(i)}
            className="relative z-10 min-w-[150px] flex-1 flex flex-col items-center text-center px-2.5"
          >
            <div
              className={`w-[76px] h-[76px] rounded-full flex items-center justify-center font-mono font-semibold text-sm mb-3.5 border-2 transition-all ${
                i === active
                  ? "bg-sun border-sun text-ink scale-105"
                  : "bg-[#212E4E] border-[#3E4C72] text-white"
              }`}
            >
              {s.code}
            </div>
            <span className="text-[0.76rem] text-[#8A96B5]">{s.age}</span>
            <span className={`font-bold text-[0.92rem] mt-0.5 ${i === active ? "text-sun" : "text-white"}`}>
              {s.name}
            </span>
          </button>
        ))}
      </div>

      <div className="mt-11 bg-[#1D2A4A] border border-[#313F63] rounded-[18px] p-8 md:p-9 flex flex-col md:flex-row gap-8 md:gap-9">
        <div className="flex-1">
          <span className="font-mono text-[0.7rem] text-sun uppercase tracking-[0.1em] mb-2.5 block">
            {stage.tag} · Age {stage.age}
          </span>
          <h3 className="font-display text-white text-2xl mb-2">{stage.name}</h3>
          <p className="text-[#C3CBE0]">{stage.desc}</p>
        </div>
        <ul className="flex-1 mt-3 pl-4.5 text-[#C3CBE0] text-[0.92rem] space-y-1.5 list-disc">
          {stage.points.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
