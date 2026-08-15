import { Metadata } from "next";
import SectionHeader from "@/components/SectionHeader";
import SafetyGrid from "@/components/SafetyGrid";
import TeacherGrid from "@/components/TeacherGrid";
import GalleryGrid from "@/components/GalleryGrid";

export const metadata: Metadata = {
  title: "Safety & Trust — Earlydays",
  description: "CCTV coverage, vetted staff, verified pickup — what we won't compromise on.",
};

export default function SafetyPage() {
  return (
    <main>
      <section className="py-20">
        <div className="wrap">
          <SectionHeader
            eyebrow="Safety & Trust"
            title="The safety questions that keep Kaduna parents up at night"
            desc="You're trusting us with your most important person. Here's exactly how we earn that trust — before you have to ask."
          />
          <SafetyGrid />
        </div>
      </section>

      <section className="py-20">
        <div className="wrap">
          <SectionHeader
            eyebrow="Meet the Teachers"
            title="The people your child sees every morning"
            desc="Replace these placeholder cards with real staff photos and bios before launch."
          />
          <TeacherGrid />
        </div>
      </section>

      <section className="py-20">
        <div className="wrap">
          <SectionHeader
            eyebrow="Campus Tour"
            title="Around Earlydays"
            desc="Placeholder tiles — drop in real campus photography for launch."
          />
          <GalleryGrid />
        </div>
      </section>
    </main>
  );
}
