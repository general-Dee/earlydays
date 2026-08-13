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
          eyebrow="What's Coming Up"
          title="Term dates & events"
          desc="Sample entries — connect to your school calendar to keep this live."
        />
        <EventsList />
      </div>
    </main>
  );
}
