import { Metadata } from "next";
import AdminCronRunsPanel from "@/components/AdminCronRunsPanel";

export const metadata: Metadata = {
  title: "Cron Runs — Earlydays Admin",
  description: "Superadmin view of scheduled reminder job run history.",
};

export default function AdminCronRunsPage() {
  return (
    <main className="py-20 bg-paper">
      <div className="wrap">
        <span className="eyebrow">Staff</span>
        <h1 className="font-display font-semibold text-3xl md:text-4xl text-ink mb-6">Cron Runs</h1>
        <AdminCronRunsPanel />
      </div>
    </main>
  );
}
