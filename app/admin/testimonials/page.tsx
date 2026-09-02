import { Metadata } from "next";
import AdminTestimonialsPanel from "@/components/AdminTestimonialsPanel";

export const metadata: Metadata = {
  title: "Testimonials — Earlydays Admin",
  description: "Staff view for managing parent testimonials shown on the public site.",
};

export default function AdminTestimonialsPage() {
  return (
    <main className="py-20 bg-paper">
      <div className="wrap">
        <span className="eyebrow">Staff</span>
        <h1 className="font-display font-semibold text-3xl md:text-4xl text-ink mb-6">Testimonials</h1>
        <AdminTestimonialsPanel />
      </div>
    </main>
  );
}
