"use client";

import AdminGate from "@/components/AdminGate";
import AdminAccessList from "@/components/AdminAccessList";

export default function AdminAccessPanel() {
  return <AdminGate>{(user) => <AdminAccessList user={user} />}</AdminGate>;
}
