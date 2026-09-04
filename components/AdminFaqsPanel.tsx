"use client";

import AdminGate from "@/components/AdminGate";
import AdminFaqsList from "@/components/AdminFaqsList";

export default function AdminFaqsPanel() {
  return <AdminGate area="faqs">{(user) => <AdminFaqsList user={user} />}</AdminGate>;
}
