"use client";

import AdminGate from "@/components/AdminGate";
import AdminSubscribersList from "@/components/AdminSubscribersList";

export default function AdminSubscribersPanel() {
  return <AdminGate area="subscribers">{(user) => <AdminSubscribersList user={user} />}</AdminGate>;
}
