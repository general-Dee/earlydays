"use client";

import { useEffect, useState } from "react";
import { daySchedules } from "@/lib/data";

export default function DayInLife() {
  const [dayIndex, setDayIndex] = useState(0);
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    setStepIndex(0);
  }, [dayIndex]);

  useEffect(() => {
    const id = setInterval(() => {
      setStepIndex((s) => (s + 1) % daySchedules[dayIndex].schedule.length);
    }, 3800);
    return () => clearInterval(id);
  }, [dayIndex]);

  const step = daySchedules[dayIndex].schedule[stepIndex];

  return (
    <div>
      <div className="flex gap-2.5 flex-wrap mb-8">
        {daySchedules.map((d, i) => (
          <button
            key={d.name}
            onClick={() => setDayIndex(i)}
            className={`px-4 py-2 rounded-full border font-medium text-sm transition-colors ${
              i === dayIndex
                ? "bg-sun/[0.16] border-sun text-accent-light"
                : "bg-transparent text-ink border-line"
            }`}
          >
            {d.name}
          </button>
        ))}
      </div>

      <div className="card grid grid-cols-1 md:grid-cols-[0.5fr_1.5fr] gap-4 md:gap-10 p-6 md:p-10">
        <div className="font-mono text-4xl text-accent-light font-medium">{step.time}</div>
        <div>
          <h2 className="font-display font-medium text-xl mb-2 text-ink">{step.title}</h2>
          <p className="mb-0 text-ink/[0.78]">{step.desc}</p>
        </div>
      </div>
    </div>
  );
}
