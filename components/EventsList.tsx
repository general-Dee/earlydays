import { events } from "@/lib/data";

export default function EventsList() {
  return (
    <div className="border-t border-line">
      {events.map((e) => (
        <div
          key={e.id}
          className="grid grid-cols-[70px_1fr] sm:grid-cols-[110px_1fr_auto] gap-4 sm:gap-6 items-center py-5.5 border-b border-line"
        >
          <div className="bg-sun-soft text-tint-text rounded-lg text-center py-2.5">
            <b className="block font-display text-2xl font-medium">{e.day}</b>
            <span className="text-[0.68rem] uppercase text-accent-light">{e.month}</span>
          </div>
          <div>
            <h4 className="text-base mb-0.5 text-ink font-medium">{e.title}</h4>
            <p className="mb-0 text-sm text-ink/[0.78]">{e.desc}</p>
          </div>
          <div className="hidden sm:inline-block text-xs font-medium px-3 py-1.5 rounded-md bg-ground-card text-ink/[0.85] whitespace-nowrap">
            {e.tag}
          </div>
        </div>
      ))}
    </div>
  );
}
