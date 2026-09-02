import Hero from "@/components/Hero";
import SectionHeader from "@/components/SectionHeader";
import PathwayVisualizer from "@/components/PathwayVisualizer";
import SafetyGrid from "@/components/SafetyGrid";
import TestimonialRow from "@/components/TestimonialRow";
import Button from "@/components/Button";
import { waLink, howItWorksSteps } from "@/lib/data";
import { getTestimonials } from "@/lib/testimonials";

// Testimonials are admin-editable (see /admin/testimonials) — revalidate
// periodically so a new or edited quote shows up here without a redeploy.
export const revalidate = 300;

export default async function HomePage() {
  const testimonials = await getTestimonials();

  return (
    <main>
      <Hero />

      <section className="py-20" id="plan">
        <div className="wrap">
          <SectionHeader eyebrow="How It Works" title="Three steps to one continuous journey" />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 mt-10">
            {howItWorksSteps.map((step) => (
              <div key={step.number}>
                <span className="font-mono text-sun text-sm font-medium">{step.number}</span>
                <h4 className="font-display font-medium text-lg text-ink mt-2 mb-1.5">{step.title}</h4>
                <p className="text-sm text-ink/[0.78] mb-0">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section
        className="py-24"
        id="pathway"
        style={{
          background: "radial-gradient(900px 420px at 85% -40%, rgba(53,59,128,0.7), transparent 64%), #262a60",
        }}
      >
        <div className="wrap">
          <span className="eyebrow">The Earlydays Difference</span>
          <h2 className="font-display font-medium text-3xl md:text-4xl text-ink">
            The only school transition your child will ever need
          </h2>
          <p className="text-ink/[0.78] max-w-[560px] mt-3">
            Most families juggle two schools and two culture shocks — a new gate, new teachers, new rules,
            right when consistency matters most. At Earlydays it&apos;s one continuous pathway. Tap a stage
            below to see exactly what that year looks like.
          </p>
          <PathwayVisualizer />
          <div className="mt-10">
            <Button href="/journey" variant="ghost">
              Explore the full journey
            </Button>
          </div>
        </div>
      </section>

      <section className="py-24">
        <div className="wrap">
          <SectionHeader
            eyebrow="Safety & Trust"
            title="The safety questions that keep Kaduna parents up at night"
            desc="You're trusting us with your most important person. Here's exactly how we earn that trust — before you have to ask."
          />
          <SafetyGrid />
        </div>
      </section>

      <section className="py-24">
        <div className="wrap">
          <SectionHeader eyebrow="Parent Voices" title="What Kaduna parents say" center />
          <TestimonialRow testimonials={testimonials} />
        </div>
      </section>

      <section className="pb-24">
        <div className="wrap">
          <div className="rounded-card bg-ground-card border border-line p-10 md:p-14 flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <h3 className="font-display font-medium text-ink text-2xl md:text-3xl mb-1.5">
                Your child&apos;s next nine years start with one visit
              </h3>
              <p className="text-ink/[0.78] mb-0">
                Book a visit in under a minute — no forms, just WhatsApp. See the campus, meet the team,
                picture what&apos;s next.
              </p>
            </div>
            <Button href={waLink("Hi, I'd like to book a tour for my child")} external variant="primary">
              Book a Visit
            </Button>
          </div>
        </div>
      </section>
    </main>
  );
}
