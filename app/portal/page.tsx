import { Metadata } from "next";
import PortalPanel from "@/components/PortalPanel";

export const metadata: Metadata = {
  title: "Parent Portal — Earlydays",
  description: "Progress reports, school calendar, and announcements in one place.",
};

const features = [
  { title: "Progress reports", desc: "Termly assessments and teacher notes, as soon as they're ready." },
  { title: "School calendar", desc: "Resumption dates, closures, and events synced to your phone." },
  { title: "Announcements", desc: "One place for everything the school sends home — nothing lost in a group chat." },
];

export default function PortalPage() {
  return (
    <main className="py-20 bg-paper">
      <div className="wrap grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
        <div>
          <span className="eyebrow">Parent Portal</span>
          <h1 className="font-display font-semibold text-3xl md:text-4xl text-ink mb-6">
            Everything about your child, in one place
          </h1>
          {features.map((f) => (
            <div key={f.title} className="flex gap-3.5 mb-5.5">
              <span className="w-2 h-2 rounded-full bg-sun mt-2 flex-shrink-0" />
              <div>
                <h4 className="text-base mb-1">{f.title}</h4>
                <p className="text-sm mb-0">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <PortalPanel />
      </div>
    </main>
  );
}
