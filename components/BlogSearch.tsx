"use client";

import { useCallback } from "react";
import { MagnifyingGlass } from "@phosphor-icons/react";
import BlogList from "@/components/BlogList";
import { useListFilter } from "@/lib/useListFilter";
import type { BlogPost } from "@/lib/firebase/types";

export default function BlogSearch({ posts }: { posts: BlogPost[] }) {
  const getSearchText = useCallback((post: BlogPost) => `${post.title} ${post.excerpt} ${post.category}`, []);
  const { query, setQuery, filtered } = useListFilter(posts, getSearchText, posts.length || 1);

  return (
    <div>
      <div className="relative max-w-sm mb-8">
        <MagnifyingGlass size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search posts…"
          aria-label="Search blog posts"
          className="w-full pl-10 pr-3.5 py-2.5 rounded-lg border border-line bg-chalk text-ink text-[0.9rem]"
        />
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-slate">No posts match &ldquo;{query}&rdquo;.</p>
      ) : (
        <BlogList posts={filtered} />
      )}
    </div>
  );
}
