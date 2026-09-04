import { Metadata } from "next";
import PortalPanel from "@/components/PortalPanel";

export const metadata: Metadata = {
  title: "Parent Portal — Earlydays",
  description: "Progress reports, school calendar, and announcements in one place.",
};

const features = [
  { title: "Progress reports", desc: "No more waiting for the termly meeting to know how they're doing." },
  { title: "School calendar", desc: "Never miss a resumption date or event again — synced straight to your phone." },
  { title: "Announcements", desc: "Every school update in one place — nothing lost in a group chat." },
];

export default function PortalPage() {
  return (
    <main className="py-20">
      <div className="wrap grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
        <div>
          <span className="eyebrow">Parent Portal</span>
          <h1 className="font-display font-medium text-3xl md:text-4xl text-ink mb-6">
            Never wonder how your child&apos;s day went
          </h1>
          {features.map((f) => (
            <div key={f.title} className="flex gap-3.5 mb-5.5">
              <span className="w-2 h-2 rounded-full bg-sun mt-2 flex-shrink-0" />
              <div>
                <h2 className="text-base mb-1 text-ink font-medium">{f.title}</h2>
                <p className="text-sm mb-0 text-ink/[0.78]">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <PortalPanel />
      </div>
    </main>
  );
}
