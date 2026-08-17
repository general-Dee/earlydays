import { Metadata } from "next";
import AdminReportsPanel from "@/components/AdminReportsPanel";

export const metadata: Metadata = {
  title: "Progress Reports — Earlydays Admin",
  description: "Staff view for uploading per-child progress reports.",
};

export default function AdminReportsPage() {
  return (
    <main className="py-20 bg-paper">
      <div className="wrap">
        <span className="eyebrow">Staff</span>
        <h1 className="font-display font-semibold text-3xl md:text-4xl text-ink mb-6">Progress Reports</h1>
        <AdminReportsPanel />
      </div>
    </main>
  );
}
