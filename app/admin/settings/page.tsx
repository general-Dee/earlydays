import { Metadata } from "next";
import AdminSettingsPanel from "@/components/AdminSettingsPanel";

export const metadata: Metadata = {
  title: "Site Settings — Earlydays Admin",
  description: "Superadmin view for editing sitewide contact info and admin notification email.",
};

export default function AdminSettingsPage() {
  return (
    <main className="py-20 bg-paper">
      <div className="wrap">
        <span className="eyebrow">Staff</span>
        <h1 className="font-display font-semibold text-3xl md:text-4xl text-ink mb-6">Site Settings</h1>
        <AdminSettingsPanel />
      </div>
    </main>
  );
}
