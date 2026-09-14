"use client";

import AdminGate from "@/components/AdminGate";
import AdminSettingsOverview from "@/components/AdminSettingsOverview";

export default function AdminSettingsPanel() {
  return <AdminGate>{(user) => <AdminSettingsOverview user={user} />}</AdminGate>;
}
