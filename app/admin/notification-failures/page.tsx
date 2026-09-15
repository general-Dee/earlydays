import { Metadata } from "next";
import AdminNotificationFailuresPanel from "@/components/AdminNotificationFailuresPanel";

export const metadata: Metadata = {
  title: "Notification Failures — Earlydays Admin",
  description: "Superadmin view of failed fee/event reminder sends.",
};

export default function AdminNotificationFailuresPage() {
  return (
    <main className="py-20 bg-paper">
      <div className="wrap">
        <span className="eyebrow">Staff</span>
        <h1 className="font-display font-semibold text-3xl md:text-4xl text-ink mb-6">Notification Failures</h1>
        <AdminNotificationFailuresPanel />
      </div>
    </main>
  );
}
