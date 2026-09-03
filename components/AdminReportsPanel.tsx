"use client";

import AdminGate from "@/components/AdminGate";
import AdminReportsList from "@/components/AdminReportsList";

export default function AdminReportsPanel() {
  return <AdminGate area="reports">{(user) => <AdminReportsList user={user} />}</AdminGate>;
}
