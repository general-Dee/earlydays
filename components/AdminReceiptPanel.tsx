"use client";

import { useAuth } from "@/lib/firebase/AuthProvider";
import PortalLoginForm from "@/components/PortalLoginForm";
import AdminReceiptView from "@/components/AdminReceiptView";

export default function AdminReceiptPanel({ reference, uid }: { reference: string; uid: string }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="card p-8 md:p-9 text-sm text-slate">
        Checking login status…
      </div>
    );
  }

  return user ? <AdminReceiptView user={user} reference={reference} uid={uid} /> : <PortalLoginForm />;
}
