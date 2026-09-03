"use client";

import AdminGate from "@/components/AdminGate";
import AdminGalleryList from "@/components/AdminGalleryList";

export default function AdminGalleryPanel() {
  return <AdminGate area="gallery">{(user) => <AdminGalleryList user={user} />}</AdminGate>;
}
