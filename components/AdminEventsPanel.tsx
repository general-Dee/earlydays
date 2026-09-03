"use client";

import AdminGate from "@/components/AdminGate";
import AdminEventsList from "@/components/AdminEventsList";

export default function AdminEventsPanel() {
  return <AdminGate area="events">{(user) => <AdminEventsList user={user} />}</AdminGate>;
}
