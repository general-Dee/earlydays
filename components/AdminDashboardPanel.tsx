"use client";

import AdminGate from "@/components/AdminGate";
import AdminDashboardOverview from "@/components/AdminDashboardOverview";

export default function AdminDashboardPanel() {
  return <AdminGate area="dashboard">{(user) => <AdminDashboardOverview user={user} />}</AdminGate>;
}
