"use client";

import AdminGate from "@/components/AdminGate";
import AdminCronRunsList from "@/components/AdminCronRunsList";

export default function AdminCronRunsPanel() {
  return <AdminGate>{(user) => <AdminCronRunsList user={user} />}</AdminGate>;
}
