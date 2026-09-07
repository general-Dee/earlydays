import { Metadata } from "next";
import AdminRateLimitsPanel from "@/components/AdminRateLimitsPanel";

export const metadata: Metadata = {
  title: "Rate Limits — Earlydays Admin",
  description: "Superadmin view of active rate-limit throttle buckets.",
};

export default function AdminRateLimitsPage() {
  return (
    <main className="py-20 bg-paper">
      <div className="wrap">
        <span className="eyebrow">Staff</span>
        <h1 className="font-display font-semibold text-3xl md:text-4xl text-ink mb-6">Rate Limits</h1>
        <AdminRateLimitsPanel />
      </div>
    </main>
  );
}
