"use client";

import AdminGate from "@/components/AdminGate";
import AdminNotificationFailuresList from "@/components/AdminNotificationFailuresList";

export default function AdminNotificationFailuresPanel() {
  return <AdminGate>{(user) => <AdminNotificationFailuresList user={user} />}</AdminGate>;
}
