"use client";

import AdminGate from "@/components/AdminGate";
import AdminInquiriesList from "@/components/AdminInquiriesList";

export default function AdminInquiriesPanel() {
  return <AdminGate area="inquiries">{(user) => <AdminInquiriesList user={user} />}</AdminGate>;
}
