import { events } from "@/lib/data";

export default function EventsList() {
  return (
    <div className="border-t border-line">
      {events.map((e) => (
        <div
          key={e.title}
          className="grid grid-cols-[70px_1fr] sm:grid-cols-[110px_1fr_auto] gap-4 sm:gap-6 items-center py-5.5 border-b border-line"
        >
          <div className="bg-ink text-white rounded-[10px] text-center py-2.5">
            <b className="block font-display text-2xl">{e.day}</b>
            <span className="text-[0.68rem] uppercase text-sun">{e.month}</span>
          </div>
          <div>
            <h4 className="text-base mb-0.5">{e.title}</h4>
            <p className="mb-0 text-sm">{e.desc}</p>
          </div>
          <div
            className="hidden sm:inline-block text-xs font-bold px-3 py-1.5 rounded-full text-white whitespace-nowrap"
            style={{ background: e.color }}
          >
            {e.tag}
          </div>
        </div>
      ))}
    </div>
  );
}
