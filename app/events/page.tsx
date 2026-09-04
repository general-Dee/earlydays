import { Metadata } from "next";
import SectionHeader from "@/components/SectionHeader";
import EventsList from "@/components/EventsList";

export const metadata: Metadata = {
  title: "Events & Term Dates — Earlydays",
  description: "Upcoming resumption dates, open days, and school events.",
};

export default function EventsPage() {
  return (
    <main className="py-20">
      <div className="wrap">
        <SectionHeader
          level={1}
          eyebrow="What's Coming Up"
          title="Term dates & events"
          desc="Resumption dates, open days, and school events, kept up to date by the school office."
        />
        <EventsList />
      </div>
    </main>
  );
}
