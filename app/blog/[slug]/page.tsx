import { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getBlogPosts } from "@/lib/blogPosts";

// Blog posts are admin-editable (see /admin/blog) — revalidate periodically
// so a new or edited post shows up here without a redeploy.
export const revalidate = 300;

export async function generateStaticParams() {
  const posts = await getBlogPosts();
  return posts.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const posts = await getBlogPosts();
  const post = posts.find((p) => p.slug === params.slug);
  if (!post) return {};
  return { title: `${post.title} — Earlydays`, description: post.excerpt };
}

export default async function BlogPostPage({ params }: { params: { slug: string } }) {
  const posts = await getBlogPosts();
  const post = posts.find((p) => p.slug === params.slug);
  if (!post) notFound();

  return (
    <main className="py-20">
      <div className="wrap max-w-[720px]">
        <Link href="/blog" className="text-sm font-medium text-accent-light">
          ← Back to all posts
        </Link>

        <div
          className="h-[220px] rounded-card mt-6 mb-8 bg-cover bg-center"
          style={post.coverPhotoUrl ? { backgroundImage: `url(${post.coverPhotoUrl})` } : { background: post.gradient }}
        />

        <span className="font-mono text-[0.7rem] uppercase text-sun font-medium tracking-wider">
          {post.category}
        </span>
        <h1 className="font-display font-medium text-3xl md:text-4xl text-ink mt-2 mb-6">
          {post.title}
        </h1>

        {post.body.map((para, i) => (
          <p key={i} className="text-[1.05rem] leading-relaxed text-ink/[0.85]">
            {para}
          </p>
        ))}
      </div>
    </main>
  );
}
