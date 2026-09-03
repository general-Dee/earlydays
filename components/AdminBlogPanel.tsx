"use client";

import AdminGate from "@/components/AdminGate";
import AdminBlogList from "@/components/AdminBlogList";

export default function AdminBlogPanel() {
  return <AdminGate area="blog">{(user) => <AdminBlogList user={user} />}</AdminGate>;
}
