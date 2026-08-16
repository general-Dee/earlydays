import Image from "next/image";
import { events } from "@/lib/data";

export default function EventsList() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
      {events.map((e) => (
        <div key={e.id} className="bg-ground-card border border-line rounded-card overflow-hidden">
          <div className="relative aspect-[16/9]">
            <Image
              src={e.image}
              alt={e.imageAlt}
              fill
              sizes="(min-width: 640px) 50vw, 100vw"
              className="object-cover"
              loading="lazy"
            />
            <div className="absolute top-3 left-3 bg-sun-soft text-tint-text rounded-lg text-center px-3 py-1.5">
              <b className="block font-display text-xl leading-none font-medium">{e.day}</b>
              <span className="text-[0.62rem] uppercase text-accent-light">{e.month}</span>
            </div>
          </div>
          <div className="p-5">
            <div className="flex items-start justify-between gap-3 mb-1">
              <h4 className="text-base text-ink font-medium">{e.title}</h4>
              <span className="text-xs font-medium px-3 py-1.5 rounded-md bg-paper text-ink/[0.85] whitespace-nowrap">
                {e.tag}
              </span>
            </div>
            <p className="mb-0 text-sm text-ink/[0.78]">{e.desc}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
