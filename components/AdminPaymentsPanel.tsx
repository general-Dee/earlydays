"use client";

import AdminGate from "@/components/AdminGate";
import AdminPaymentsList from "@/components/AdminPaymentsList";

export default function AdminPaymentsPanel() {
  return <AdminGate area="payments">{(user) => <AdminPaymentsList user={user} />}</AdminGate>;
}
