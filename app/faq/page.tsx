import { Metadata } from "next";
import SectionHeader from "@/components/SectionHeader";
import FaqAccordion from "@/components/FaqAccordion";
import { getFaqs } from "@/lib/faqs";

export const metadata: Metadata = {
  title: "Frequently Asked Questions — Earlydays",
  description: "Answers to common questions about fees, admissions, safety, and daily life at Earlydays.",
};

// FAQs are admin-editable (see /admin/faqs) — revalidate periodically so a
// new or edited entry shows up here without a redeploy.
export const revalidate = 300;

export default async function FaqPage() {
  const faqs = await getFaqs();

  return (
    <main className="py-20">
      <div className="wrap">
        <SectionHeader
          eyebrow="Questions"
          title="Frequently asked questions"
          desc="Fees, admissions, safety, and the daily schedule — the questions parents ask most."
        />
        <FaqAccordion faqs={faqs} />
      </div>
    </main>
  );
}
