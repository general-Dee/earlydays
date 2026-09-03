import { Metadata } from "next";
import AdminAccessPanel from "@/components/AdminAccessPanel";

export const metadata: Metadata = {
  title: "Admin Access — Earlydays Admin",
  description: "Superadmin view for managing admin accounts and area permissions.",
};

export default function AdminAccessPage() {
  return (
    <main className="py-20 bg-paper">
      <div className="wrap">
        <span className="eyebrow">Staff</span>
        <h1 className="font-display font-semibold text-3xl md:text-4xl text-ink mb-6">Admin Access</h1>
        <AdminAccessPanel />
      </div>
    </main>
  );
}
