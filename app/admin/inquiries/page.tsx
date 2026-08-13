import { Metadata } from "next";
import AdminInquiriesPanel from "@/components/AdminInquiriesPanel";

export const metadata: Metadata = {
  title: "Inquiries — Earlydays Admin",
  description: "Staff view of contact form submissions.",
};

export default function AdminInquiriesPage() {
  return (
    <main className="py-20 bg-paper">
      <div className="wrap">
        <span className="eyebrow">Staff</span>
        <h1 className="font-display font-semibold text-3xl md:text-4xl text-ink mb-6">Inquiries</h1>
        <AdminInquiriesPanel />
      </div>
    </main>
  );
}
