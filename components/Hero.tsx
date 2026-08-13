import Button from "./Button";
import { waLink } from "@/lib/data";

export default function Hero() {
  return (
    <section className="pt-16 pb-10">
      <div className="wrap grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-12 lg:gap-16 items-center">
        <div>
          <span className="eyebrow">Earlydays Nursery &amp; Primary School · Kaduna</span>
          <h1 className="font-display font-semibold text-4xl md:text-5xl lg:text-[3.6rem] leading-[1.05] text-ink">
            One school, <span className="text-clay">one journey</span> — from first steps to Primary 6
          </h1>
          <p className="text-lg max-w-[520px] mt-5">
            No handover, no new gate, no starting over at age five. Earlydays carries every child through
            nursery and primary on one campus, one philosophy, and one relationship with your family — start
            to finish.
          </p>
          <div className="flex gap-3.5 flex-wrap mt-6">
            <Button href={waLink("Hi, I'd like to book a tour")} external>
              📲 Book a Visit on WhatsApp
            </Button>
            <Button href="/journey" variant="ghost">
              See the Journey
            </Button>
          </div>
          <div className="flex gap-8 mt-11">
            <div>
              <b className="block font-display text-2xl text-ink">1</b>
              <span className="text-[0.8rem] text-slate">Campus, Creche→P6</span>
            </div>
            <div>
              <b className="block font-display text-2xl text-ink">9</b>
              <span className="text-[0.8rem] text-slate">Stages, zero transitions</span>
            </div>
            <div>
              <b className="block font-display text-2xl text-ink">CCTV</b>
              <span className="text-[0.8rem] text-slate">Full campus coverage</span>
            </div>
          </div>
        </div>

        <div className="relative h-[280px] lg:h-[420px] rounded-3xl overflow-hidden order-first lg:order-last bg-gradient-to-br from-sun-soft via-leaf-soft to-clay-soft">
          <svg viewBox="0 0 400 400" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 w-full h-full">
            <defs>
              <linearGradient id="pathgrad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#F5A623" stopOpacity="0.5" />
                <stop offset="100%" stopColor="#3F7D58" stopOpacity="0.5" />
              </linearGradient>
            </defs>
            <path
              d="M40,340 C120,300 100,220 180,200 C260,180 240,100 340,60"
              fill="none"
              stroke="url(#pathgrad)"
              strokeWidth="26"
              strokeLinecap="round"
            />
            <circle cx="40" cy="340" r="16" fill="#C4522A" />
            <circle cx="180" cy="200" r="14" fill="#16213E" />
            <circle cx="340" cy="60" r="16" fill="#3F7D58" />
            <circle cx="90" cy="300" r="6" fill="#16213E" opacity="0.6" />
            <circle cx="260" cy="140" r="6" fill="#16213E" opacity="0.6" />
          </svg>
        </div>
      </div>
    </section>
  );
}
