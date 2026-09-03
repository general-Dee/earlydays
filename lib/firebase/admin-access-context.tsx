"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useAuth } from "@/lib/firebase/AuthProvider";
import type { AdminArea } from "@/lib/firebase/types";

export type AccessState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; isSuperAdmin: boolean; areas: AdminArea[] };

const AdminAccessContext = createContext<AccessState>({ status: "idle" });

// Shared across every admin page (mounted once in app/admin/layout.tsx) so
// the areas a signed-in admin can see are fetched once per session, not
// once per panel. Split out from components/AdminGate.tsx so that
// useAdminAccess is a real cross-module dependency AdminGate imports —
// vi.mock can only intercept that kind of import, not a same-file closure
// reference, which is what tests need to stub out access state.
export function AdminAccessProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [state, setState] = useState<AccessState>({ status: "idle" });

  useEffect(() => {
    if (!user) {
      setState({ status: "idle" });
      return;
    }

    let cancelled = false;
    setState({ status: "loading" });

    async function load() {
      try {
        const idToken = await user!.getIdToken();
        const res = await fetch("/api/admin/me", { headers: { Authorization: `Bearer ${idToken}` } });
        if (cancelled) return;

        if (!res.ok) {
          setState({ status: "error" });
          return;
        }

        const data = (await res.json()) as { isSuperAdmin: boolean; areas: AdminArea[] };
        setState({ status: "ready", isSuperAdmin: data.isSuperAdmin, areas: data.areas });
      } catch {
        if (!cancelled) setState({ status: "error" });
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [user]);

  return <AdminAccessContext.Provider value={state}>{children}</AdminAccessContext.Provider>;
}

export function useAdminAccess() {
  return useContext(AdminAccessContext);
}
