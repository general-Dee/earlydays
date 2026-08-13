import Link from "next/link";
import { blogPosts } from "@/lib/data";

export default function BlogList({ limit }: { limit?: number }) {
  const posts = limit ? blogPosts.slice(0, limit) : blogPosts;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
      {posts.map((p) => (
        <Link key={p.slug} href={`/blog/${p.slug}`} className="card overflow-hidden block hover:-translate-y-1 transition-transform">
          <div className="h-[130px]" style={{ background: p.gradient }} />
          <div className="p-6">
            <span className="font-mono text-[0.68rem] uppercase text-leaf font-semibold tracking-wider">
              {p.category}
            </span>
            <h4 className="font-display text-base mt-2 mb-1.5">{p.title}</h4>
            <p className="text-sm mb-0">{p.excerpt}</p>
          </div>
        </Link>
      ))}
    </div>
  );
}
