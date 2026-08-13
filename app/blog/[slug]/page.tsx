import { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { blogPosts } from "@/lib/data";

export function generateStaticParams() {
  return blogPosts.map((p) => ({ slug: p.slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const post = blogPosts.find((p) => p.slug === params.slug);
  if (!post) return {};
  return { title: `${post.title} — Earlydays`, description: post.excerpt };
}

export default function BlogPostPage({ params }: { params: { slug: string } }) {
  const post = blogPosts.find((p) => p.slug === params.slug);
  if (!post) notFound();

  return (
    <main className="py-20">
      <div className="wrap max-w-[720px]">
        <Link href="/blog" className="text-sm font-semibold text-clay">
          ← Back to all posts
        </Link>

        <div className="h-[220px] rounded-card mt-6 mb-8" style={{ background: post.gradient }} />

        <span className="font-mono text-[0.7rem] uppercase text-leaf font-semibold tracking-wider">
          {post.category}
        </span>
        <h1 className="font-display font-semibold text-3xl md:text-4xl text-ink mt-2 mb-6">
          {post.title}
        </h1>

        {post.body.map((para, i) => (
          <p key={i} className="text-[1.05rem] leading-relaxed">
            {para}
          </p>
        ))}
      </div>
    </main>
  );
}
