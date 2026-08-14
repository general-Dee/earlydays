import { Metadata } from "next";
import AdminAnnouncementsPanel from "@/components/AdminAnnouncementsPanel";

export const metadata: Metadata = {
  title: "Announcements — Earlydays Admin",
  description: "Staff view for posting parent-facing announcements.",
};

export default function AdminAnnouncementsPage() {
  return (
    <main className="py-20 bg-paper">
      <div className="wrap">
        <span className="eyebrow">Staff</span>
        <h1 className="font-display font-semibold text-3xl md:text-4xl text-ink mb-6">Announcements</h1>
        <AdminAnnouncementsPanel />
      </div>
    </main>
  );
}
