import { Metadata } from "next";
import SectionHeader from "@/components/SectionHeader";
import Gallery from "@/components/Gallery";

export const metadata: Metadata = {
  title: "Gallery — Earlydays",
  description: "A look around the Earlydays campus — classrooms, grounds, and play areas in Kaduna.",
};

export default function GalleryPage() {
  return (
    <main>
      <section className="py-20">
        <div className="wrap">
          <SectionHeader
            eyebrow="Gallery"
            title="A look around Earlydays"
            desc="Real classrooms, real grounds — filter by area or open any photo for a closer look."
          />
          <Gallery />
        </div>
      </section>
    </main>
  );
}
