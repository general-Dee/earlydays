import { Metadata } from "next";
import AdminSubscribersPanel from "@/components/AdminSubscribersPanel";

export const metadata: Metadata = {
  title: "Subscribers — Earlydays Admin",
  description: "Staff view for the newsletter signup list.",
};

export default function AdminSubscribersPage() {
  return (
    <main className="py-20 bg-paper">
      <div className="wrap">
        <span className="eyebrow">Staff</span>
        <h1 className="font-display font-semibold text-3xl md:text-4xl text-ink mb-6">Subscribers</h1>
        <AdminSubscribersPanel />
      </div>
    </main>
  );
}
