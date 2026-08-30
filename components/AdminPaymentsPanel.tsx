"use client";

import { useAuth } from "@/lib/firebase/AuthProvider";
import PortalLoginForm from "@/components/PortalLoginForm";
import AdminPaymentsList from "@/components/AdminPaymentsList";

export default function AdminPaymentsPanel() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="card p-8 md:p-9 text-sm text-slate">
        Checking login status…
      </div>
    );
  }

  return user ? <AdminPaymentsList user={user} /> : <PortalLoginForm />;
}
