import { Metadata } from "next";
import AdminAuditLogPanel from "@/components/AdminAuditLogPanel";

export const metadata: Metadata = {
  title: "Audit Log — Earlydays Admin",
  description: "Superadmin view of admin account create/update/disable/remove actions.",
};

export default function AdminAuditLogPage() {
  return (
    <main className="py-20 bg-paper">
      <div className="wrap">
        <span className="eyebrow">Staff</span>
        <h1 className="font-display font-semibold text-3xl md:text-4xl text-ink mb-6">Audit Log</h1>
        <AdminAuditLogPanel />
      </div>
    </main>
  );
}
