import { Metadata } from "next";
import SectionHeader from "@/components/SectionHeader";
import BlogSearch from "@/components/BlogSearch";
import { notFound } from "next/navigation";
import { getBlogPosts } from "@/lib/blogPosts";

export const metadata: Metadata = {
  title: "Notes for Parents — Earlydays Blog",
  description: "Short, practical reads for parents from the Earlydays team.",
};

// Blog posts are admin-editable (see /admin/blog) — revalidate periodically
// so a new or edited post shows up here without a redeploy.
export const revalidate = 300;

export default async function BlogPage() {
  const posts = await getBlogPosts();
  // No real posts yet: the blog is hidden (nav link and sitemap too).
  if (!posts.length) notFound();

  return (
    <main className="py-20">
      <div className="wrap">
        <SectionHeader
          level={1}
          eyebrow="From Earlydays"
          title="Straight answers for Kaduna parents, no fluff"
          desc="Real questions from real parents — settling in, school readiness, and everything between naptime and Primary 6."
        />
        <BlogSearch posts={posts} />
      </div>
    </main>
  );
}
