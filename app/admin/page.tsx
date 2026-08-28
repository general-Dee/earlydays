import { Metadata } from "next";
import AdminDashboardPanel from "@/components/AdminDashboardPanel";

export const metadata: Metadata = {
  title: "Dashboard — Earlydays Admin",
  description: "Staff overview of applications, fee collection, and inquiries.",
};

export default function AdminDashboardPage() {
  return (
    <main className="py-20 bg-paper">
      <div className="wrap">
        <span className="eyebrow">Staff</span>
        <h1 className="font-display font-semibold text-3xl md:text-4xl text-ink mb-6">Overview</h1>
        <AdminDashboardPanel />
      </div>
    </main>
  );
}
