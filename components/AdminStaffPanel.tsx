"use client";

import { useAuth } from "@/lib/firebase/AuthProvider";
import PortalLoginForm from "@/components/PortalLoginForm";
import AdminStaffList from "@/components/AdminStaffList";

export default function AdminStaffPanel() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="card p-8 md:p-9 text-sm text-slate">
        Checking login status…
      </div>
    );
  }

  return user ? <AdminStaffList user={user} /> : <PortalLoginForm />;
}
