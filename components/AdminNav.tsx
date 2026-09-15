"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAdminAccess } from "@/lib/firebase/admin-access-context";
import type { AdminArea } from "@/lib/firebase/types";

type NavItem = { href: string; label: string; area?: AdminArea };

// area omitted means superadmin-only, mirroring the pages themselves
// (each wraps its panel in <AdminGate> with no area prop — see
// components/AdminAccessPanel.tsx, AdminSettingsPanel.tsx, and the
// audit/rate-limits/cron-runs panels).
const NAV_ITEMS: NavItem[] = [
  { href: "/admin", label: "Dashboard", area: "dashboard" },
  { href: "/admin/applications", label: "Applications", area: "applications" },
  { href: "/admin/parents", label: "Parents", area: "parents" },
  { href: "/admin/payments", label: "Payments", area: "payments" },
  { href: "/admin/inquiries", label: "Inquiries", area: "inquiries" },
  { href: "/admin/reports", label: "Reports", area: "reports" },
  { href: "/admin/announcements", label: "Announcements", area: "announcements" },
  { href: "/admin/events", label: "Events", area: "events" },
  { href: "/admin/staff", label: "Staff", area: "staff" },
  { href: "/admin/blog", label: "Blog", area: "blog" },
  { href: "/admin/gallery", label: "Gallery", area: "gallery" },
  { href: "/admin/testimonials", label: "Testimonials", area: "testimonials" },
  { href: "/admin/faqs", label: "FAQs", area: "faqs" },
  { href: "/admin/subscribers", label: "Subscribers", area: "subscribers" },
  { href: "/admin/access", label: "Admin Access" },
  { href: "/admin/settings", label: "Site Settings" },
  { href: "/admin/audit", label: "Audit Log" },
  { href: "/admin/rate-limits", label: "Rate Limits" },
  { href: "/admin/cron-runs", label: "Cron Runs" },
  { href: "/admin/notification-failures", label: "Notification Failures" },
];

export default function AdminNav() {
  const pathname = usePathname();
  const access = useAdminAccess();

  if (access.status !== "ready") return null;

  const items = NAV_ITEMS.filter(
    (item) => access.isSuperAdmin || (item.area !== undefined && access.areas.includes(item.area))
  );

  if (items.length === 0) return null;

  return (
    <nav aria-label="Admin" className="flex flex-wrap gap-2 pt-6">
      {items.map((item) => {
        const active = item.href === "/admin" ? pathname === "/admin" : pathname?.startsWith(item.href) ?? false;
        return (
          <Link key={item.href} href={item.href} className={`btn btn-sm ${active ? "btn-primary" : "btn-ghost"}`}>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
