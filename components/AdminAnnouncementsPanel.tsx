"use client";

import { useAuth } from "@/lib/firebase/AuthProvider";
import PortalLoginForm from "@/components/PortalLoginForm";
import AdminAnnouncementsList from "@/components/AdminAnnouncementsList";

export default function AdminAnnouncementsPanel() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="card p-8 md:p-9 text-sm text-slate">
        Checking login status…
      </div>
    );
  }

  return user ? <AdminAnnouncementsList user={user} /> : <PortalLoginForm />;
}
