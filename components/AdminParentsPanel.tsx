"use client";

import AdminGate from "@/components/AdminGate";
import AdminParentsList from "@/components/AdminParentsList";

export default function AdminParentsPanel() {
  return <AdminGate area="parents">{(user) => <AdminParentsList user={user} />}</AdminGate>;
}
