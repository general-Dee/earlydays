import { Metadata } from "next";
import AdminParentsPanel from "@/components/AdminParentsPanel";

export const metadata: Metadata = {
  title: "Parent Accounts — Earlydays Admin",
  description: "Staff view for creating parent portal accounts.",
};

export default function AdminParentsPage() {
  return (
    <main className="py-20 bg-paper">
      <div className="wrap">
        <span className="eyebrow">Staff</span>
        <h1 className="font-display font-semibold text-3xl md:text-4xl text-ink mb-6">Parent Accounts</h1>
        <AdminParentsPanel />
      </div>
    </main>
  );
}
