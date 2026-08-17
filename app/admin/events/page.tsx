import { Metadata } from "next";
import AdminEventsPanel from "@/components/AdminEventsPanel";

export const metadata: Metadata = {
  title: "Events — Earlydays Admin",
  description: "Staff view for managing term dates and school events.",
};

export default function AdminEventsPage() {
  return (
    <main className="py-20 bg-paper">
      <div className="wrap">
        <span className="eyebrow">Staff</span>
        <h1 className="font-display font-semibold text-3xl md:text-4xl text-ink mb-6">Events</h1>
        <AdminEventsPanel />
      </div>
    </main>
  );
}
