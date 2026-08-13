import Hero from "@/components/Hero";
import SectionHeader from "@/components/SectionHeader";
import PathwayVisualizer from "@/components/PathwayVisualizer";
import SafetyGrid from "@/components/SafetyGrid";
import TestimonialRow from "@/components/TestimonialRow";
import Button from "@/components/Button";
import { waLink } from "@/lib/data";

export default function HomePage() {
  return (
    <main>
      <Hero />

      <section className="bg-ink py-24" id="pathway">
        <div className="wrap">
          <span className="eyebrow text-sun">The Earlydays Difference</span>
          <h2 className="font-display font-semibold text-3xl md:text-4xl text-white">
            The pathway your child never has to leave
          </h2>
          <p className="text-[#B9C2D6] max-w-[560px] mt-3">
            Most families juggle two schools and two culture shocks. At Earlydays it&apos;s one continuous
            pathway. Tap a stage to see what that year actually looks like.
          </p>
          <PathwayVisualizer />
          <div className="mt-10">
            <Button href="/journey" variant="ghost" className="border-white text-white">
              Explore the full journey
            </Button>
          </div>
        </div>
      </section>

      <section className="py-24 bg-paper">
        <div className="wrap">
          <SectionHeader
            eyebrow="Safety & Trust"
            title="What we won't compromise on"
            desc="The questions every Kaduna parent asks before enrolling — answered up front, not after you ask."
          />
          <SafetyGrid />
        </div>
      </section>

      <section className="py-24">
        <div className="wrap">
          <SectionHeader eyebrow="Parent Voices" title="What Kaduna parents say" center />
          <TestimonialRow />
        </div>
      </section>

      <section className="pb-24">
        <div className="wrap">
          <div className="rounded-[20px] bg-clay text-white p-10 md:p-14 flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <h3 className="font-display text-white text-2xl md:text-3xl mb-1.5">
                Come see the campus for yourself
              </h3>
              <p className="text-white/85 mb-0">Book a visit in under a minute — no forms, just WhatsApp.</p>
            </div>
            <Button href={waLink("Hi, I'd like to book a tour for my child")} external variant="primary">
              📲 Book a Visit
            </Button>
          </div>
        </div>
      </section>
    </main>
  );
}
