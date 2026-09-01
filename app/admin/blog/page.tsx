import { Metadata } from "next";
import AdminBlogPanel from "@/components/AdminBlogPanel";

export const metadata: Metadata = {
  title: "Blog — Earlydays Admin",
  description: "Staff view for managing blog posts shown on the public site.",
};

export default function AdminBlogPage() {
  return (
    <main className="py-20 bg-paper">
      <div className="wrap">
        <span className="eyebrow">Staff</span>
        <h1 className="font-display font-semibold text-3xl md:text-4xl text-ink mb-6">Blog Posts</h1>
        <AdminBlogPanel />
      </div>
    </main>
  );
}
