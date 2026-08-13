import { Metadata } from "next";
import SectionHeader from "@/components/SectionHeader";
import PathwayVisualizer from "@/components/PathwayVisualizer";
import DayInLife from "@/components/DayInLife";

export const metadata: Metadata = {
  title: "The Journey — Earlydays",
  description: "From Creche to Primary 6 — one continuous pathway, stage by stage.",
};

export default function JourneyPage() {
  return (
    <main>
      <section className="py-20">
        <div className="wrap">
          <SectionHeader
            eyebrow="The Earlydays Difference"
            title="The pathway your child never has to leave"
            desc="Most families juggle two schools and two culture shocks. At Earlydays it's one continuous pathway. Tap a stage to see what that year actually looks like."
          />
        </div>
      </section>

      <section className="bg-ink py-20">
        <div className="wrap">
          <PathwayVisualizer />
        </div>
      </section>

      <section className="py-24 bg-paper">
        <div className="wrap">
          <SectionHeader
            eyebrow="A Day at Earlydays"
            title="What your child's day actually looks like"
            desc="Pick a stage. See the real rhythm — not a brochure promise."
          />
          <DayInLife />
        </div>
      </section>
    </main>
  );
}
