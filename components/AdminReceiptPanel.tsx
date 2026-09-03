"use client";

import AdminGate from "@/components/AdminGate";
import AdminReceiptView from "@/components/AdminReceiptView";

export default function AdminReceiptPanel({ reference, uid }: { reference: string; uid: string }) {
  return (
    <AdminGate area="payments">
      {(user) => <AdminReceiptView user={user} reference={reference} uid={uid} />}
    </AdminGate>
  );
}
