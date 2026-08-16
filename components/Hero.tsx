import Image from "next/image";
import Button from "./Button";
import { waLink } from "@/lib/data";

export default function Hero() {
  return (
    <section className="pt-16 pb-10">
      <div className="wrap grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-12 lg:gap-16 items-center">
        <div>
          <span className="eyebrow">For Kaduna Parents Who Want One School, Not Three</span>
          <h1 className="font-display font-medium text-4xl md:text-5xl lg:text-[3.6rem] leading-[1.1] tracking-[-0.015em] text-ink">
            Your child deserves <span className="text-accent-light">one school</span> for the whole journey — not three
          </h1>
          <p className="text-lg max-w-[520px] mt-5 text-ink/[0.78]">
            Switching schools at three, then again at five, means a new gate, new teachers, and a new culture
            shock — right when your child needs stability most. Earlydays carries every child from Creche to
            Primary 6 on one campus, so the only thing that changes each year is what they&apos;re learning.
          </p>
          <div className="flex gap-3.5 flex-wrap mt-6">
            <Button href={waLink("Hi, I'd like to book a tour")} external>
              Book a Visit on WhatsApp
            </Button>
            <Button href="#plan" variant="ghost">
              See How It Works
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

        <div className="relative h-[280px] lg:h-[420px] rounded-card overflow-hidden order-first lg:order-last border border-line">
          <Image
            src="/ct01.PNG"
            alt="Sunflower-painted welcome entrance and gate at the Earlydays campus in Kaduna"
            fill
            priority
            sizes="(min-width: 1024px) 45vw, 100vw"
            className="object-cover"
          />
        </div>
      </div>
    </section>
  );
}
