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
            title="The only school transition your child will ever need"
            desc="Most families juggle two schools and two culture shocks — a new gate, new teachers, new rules, right when consistency matters most. At Earlydays it's one continuous pathway from Creche to Primary 6. Tap a stage to see exactly what that year looks like."
          />
        </div>
      </section>

      <section
        className="py-20"
        style={{
          background: "radial-gradient(900px 420px at 85% -40%, rgba(53,59,128,0.7), transparent 64%), #262a60",
        }}
      >
        <div className="wrap">
          <PathwayVisualizer />
        </div>
      </section>

      <section className="py-24">
        <div className="wrap">
          <SectionHeader
            eyebrow="A Day at Earlydays"
            title="See the real rhythm, not a brochure promise"
            desc="This is what actually happens on campus every day, hour by hour. Pick a stage and see for yourself."
          />
          <DayInLife />
        </div>
      </section>
    </main>
  );
}
