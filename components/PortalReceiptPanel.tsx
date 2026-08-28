"use client";

import { useAuth } from "@/lib/firebase/AuthProvider";
import PortalLoginForm from "@/components/PortalLoginForm";
import PortalReceiptView from "@/components/PortalReceiptView";

export default function PortalReceiptPanel({ reference }: { reference: string }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="card p-8 md:p-9 text-sm text-slate">
        Checking login status…
      </div>
    );
  }

  return user ? <PortalReceiptView user={user} reference={reference} /> : <PortalLoginForm />;
}
