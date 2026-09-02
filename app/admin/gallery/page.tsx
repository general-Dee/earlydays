import { Metadata } from "next";
import AdminGalleryPanel from "@/components/AdminGalleryPanel";

export const metadata: Metadata = {
  title: "Gallery — Earlydays Admin",
  description: "Staff view for managing campus gallery photos shown on the public site.",
};

export default function AdminGalleryPage() {
  return (
    <main className="py-20 bg-paper">
      <div className="wrap">
        <span className="eyebrow">Staff</span>
        <h1 className="font-display font-semibold text-3xl md:text-4xl text-ink mb-6">Gallery Photos</h1>
        <AdminGalleryPanel />
      </div>
    </main>
  );
}
