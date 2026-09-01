import Link from "next/link";
import type { BlogPost } from "@/lib/firebase/types";

export default function BlogList({ posts: allPosts, limit }: { posts: BlogPost[]; limit?: number }) {
  const posts = limit ? allPosts.slice(0, limit) : allPosts;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
      {posts.map((p) => (
        <Link key={p.slug} href={`/blog/${p.slug}`} className="card overflow-hidden block hover:border-sun/50 transition-colors">
          <div
            className="h-[130px] bg-cover bg-center"
            style={p.coverPhotoUrl ? { backgroundImage: `url(${p.coverPhotoUrl})` } : { background: p.gradient }}
          />
          <div className="p-6">
            <span className="font-mono text-[0.68rem] uppercase text-sun font-medium tracking-wider">
              {p.category}
            </span>
            <h4 className="font-display font-medium text-base mt-2 mb-1.5 text-ink">{p.title}</h4>
            <p className="text-sm mb-0 text-ink/[0.78]">{p.excerpt}</p>
          </div>
        </Link>
      ))}
    </div>
  );
}
