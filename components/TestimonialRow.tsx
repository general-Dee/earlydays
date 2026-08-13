import { testimonials } from "@/lib/data";

export default function TestimonialRow() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
      {testimonials.map((t) => (
        <div key={t.name} className="card p-7">
          <p className="text-[0.96rem] text-ink-soft italic">&ldquo;{t.quote}&rdquo;</p>
          <div className="flex items-center gap-3 mt-4">
            <div className="w-[38px] h-[38px] rounded-full bg-sun-soft text-clay flex items-center justify-center font-display font-bold">
              {t.initial}
            </div>
            <div>
              <b className="block text-sm">{t.name}</b>
              <span className="text-xs text-slate">{t.area}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
