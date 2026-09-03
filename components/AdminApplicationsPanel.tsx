"use client";

import AdminGate from "@/components/AdminGate";
import AdminApplicationsList from "@/components/AdminApplicationsList";

export default function AdminApplicationsPanel() {
  return <AdminGate area="applications">{(user) => <AdminApplicationsList user={user} />}</AdminGate>;
}
