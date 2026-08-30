import { Metadata } from "next";
import SectionHeader from "@/components/SectionHeader";
import SafetyGrid from "@/components/SafetyGrid";
import TeacherGrid from "@/components/TeacherGrid";
import GalleryGrid from "@/components/GalleryGrid";
import Button from "@/components/Button";

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
            desc="The team who greets your child at the door and knows them by name."
          />
          <TeacherGrid />
        </div>
      </section>

      <section className="py-20">
        <div className="wrap">
          <SectionHeader
            eyebrow="Campus Tour"
            title="Around Earlydays"
            desc="A glimpse of the grounds and classrooms your child will spend their days in."
          />
          <GalleryGrid />
          <div className="mt-8">
            <Button href="/gallery" variant="ghost">
              View Full Gallery →
            </Button>
          </div>
        </div>
      </section>
    </main>
  );
}
