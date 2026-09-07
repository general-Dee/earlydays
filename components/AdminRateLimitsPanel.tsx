"use client";

import AdminGate from "@/components/AdminGate";
import AdminRateLimitsList from "@/components/AdminRateLimitsList";

export default function AdminRateLimitsPanel() {
  return <AdminGate>{(user) => <AdminRateLimitsList user={user} />}</AdminGate>;
}
