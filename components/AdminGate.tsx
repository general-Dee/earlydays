"use client";

import type { User } from "firebase/auth";
import { useAuth } from "@/lib/firebase/AuthProvider";
import PortalLoginForm from "@/components/PortalLoginForm";
import { useAdminAccess } from "@/lib/firebase/admin-access-context";
import type { AdminArea } from "@/lib/firebase/types";

export { AdminAccessProvider, useAdminAccess } from "@/lib/firebase/admin-access-context";

// Gates an admin page/panel behind both a valid session and area-level
// authorization, closing the gap where any logged-in user (including a
// parent) could see the panel shell before its own data fetch 403'd.
export default function AdminGate({
  area,
  children,
}: {
  area?: AdminArea;
  children: (user: User) => React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const access = useAdminAccess();

  if (loading) {
    return <div className="card p-8 md:p-9 text-sm text-slate">Checking login status…</div>;
  }

  if (!user) {
    return <PortalLoginForm />;
  }

  if (access.status === "idle" || access.status === "loading") {
    return <div className="card p-8 md:p-9 text-sm text-slate">Checking access…</div>;
  }

  if (access.status === "error") {
    return (
      <div className="card p-8 md:p-9 text-sm text-clay">
        Couldn&rsquo;t confirm your admin access. Please try again.
      </div>
    );
  }

  if (!(access.isSuperAdmin || (area !== undefined && access.areas.includes(area)))) {
    return (
      <div className="card p-8 md:p-9 text-sm text-clay">
        You&rsquo;re logged in, but this account isn&rsquo;t authorized to view this area.
      </div>
    );
  }

  return <>{children(user)}</>;
}
