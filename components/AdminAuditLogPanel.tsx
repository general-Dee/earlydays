"use client";

import AdminGate from "@/components/AdminGate";
import AdminAuditLogList from "@/components/AdminAuditLogList";

export default function AdminAuditLogPanel() {
  return <AdminGate>{(user) => <AdminAuditLogList user={user} />}</AdminGate>;
}
