import { Metadata } from "next";
import AdminStaffPanel from "@/components/AdminStaffPanel";

export const metadata: Metadata = {
  title: "Staff — Earlydays Admin",
  description: "Staff view for managing teacher and staff profiles shown on the public site.",
};

export default function AdminStaffPage() {
  return (
    <main className="py-20 bg-paper">
      <div className="wrap">
        <span className="eyebrow">Staff</span>
        <h1 className="font-display font-semibold text-3xl md:text-4xl text-ink mb-6">Staff Profiles</h1>
        <AdminStaffPanel />
      </div>
    </main>
  );
}
