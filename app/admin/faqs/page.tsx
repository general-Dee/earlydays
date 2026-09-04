import { Metadata } from "next";
import AdminFaqsPanel from "@/components/AdminFaqsPanel";

export const metadata: Metadata = {
  title: "FAQs — Earlydays Admin",
  description: "Staff view for managing the public FAQ page.",
};

export default function AdminFaqsPage() {
  return (
    <main className="py-20 bg-paper">
      <div className="wrap">
        <span className="eyebrow">Staff</span>
        <h1 className="font-display font-semibold text-3xl md:text-4xl text-ink mb-6">FAQs</h1>
        <AdminFaqsPanel />
      </div>
    </main>
  );
}
