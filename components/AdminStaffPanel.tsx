"use client";

import AdminGate from "@/components/AdminGate";
import AdminStaffList from "@/components/AdminStaffList";

export default function AdminStaffPanel() {
  return <AdminGate area="staff">{(user) => <AdminStaffList user={user} />}</AdminGate>;
}
