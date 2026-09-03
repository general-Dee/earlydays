"use client";

import AdminGate from "@/components/AdminGate";
import AdminAnnouncementsList from "@/components/AdminAnnouncementsList";

export default function AdminAnnouncementsPanel() {
  return <AdminGate area="announcements">{(user) => <AdminAnnouncementsList user={user} />}</AdminGate>;
}
