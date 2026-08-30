import { Metadata } from "next";
import AdminPaymentsPanel from "@/components/AdminPaymentsPanel";

export const metadata: Metadata = {
  title: "Payments — Earlydays Admin",
  description: "Staff view for looking up individual fee payments and receipts.",
};

export default function AdminPaymentsPage() {
  return (
    <main className="py-20 bg-paper">
      <div className="wrap">
        <span className="eyebrow">Staff</span>
        <h1 className="font-display font-semibold text-3xl md:text-4xl text-ink mb-6">Payments</h1>
        <AdminPaymentsPanel />
      </div>
    </main>
  );
}
