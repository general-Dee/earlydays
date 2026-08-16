import { Metadata } from "next";
import AdminApplicationsPanel from "@/components/AdminApplicationsPanel";

export const metadata: Metadata = {
  title: "Applications — Earlydays Admin",
  description: "Staff view of admission applications.",
};

export default function AdminApplicationsPage() {
  return (
    <main className="py-20 bg-paper">
      <div className="wrap">
        <span className="eyebrow">Staff</span>
        <h1 className="font-display font-semibold text-3xl md:text-4xl text-ink mb-6">Applications</h1>
        <AdminApplicationsPanel />
      </div>
    </main>
  );
}
