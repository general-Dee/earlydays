import { describe, expect, it, vi } from "vitest";
import sitemap from "@/app/sitemap";
import { site } from "@/lib/data";

const fakePosts = [
  { id: "p1", slug: "post-one" },
  { id: "p2", slug: "post-two" },
];

vi.mock("@/lib/blogPosts", () => ({
  getBlogPosts: () => Promise.resolve(fakePosts),
}));

describe("sitemap", () => {
  it("includes the homepage", async () => {
    const entries = await sitemap();
    expect(entries.some((entry) => entry.url === `${site.url}/`)).toBe(true);
  });

  it("includes one entry per blog post", async () => {
    const entries = await sitemap();
    for (const post of fakePosts) {
      expect(entries.some((entry) => entry.url === `${site.url}/blog/${post.slug}`)).toBe(true);
    }
  });

  it("builds every URL from the configured site URL", async () => {
    const entries = await sitemap();
    for (const entry of entries) {
      expect(entry.url.startsWith(site.url)).toBe(true);
    }
  });
});
