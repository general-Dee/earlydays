import { describe, expect, it } from "vitest";
import sitemap from "@/app/sitemap";
import { blogPosts, site } from "@/lib/data";

describe("sitemap", () => {
  it("includes the homepage", () => {
    const entries = sitemap();
    expect(entries.some((entry) => entry.url === `${site.url}/`)).toBe(true);
  });

  it("includes one entry per blog post", () => {
    const entries = sitemap();
    for (const post of blogPosts) {
      expect(entries.some((entry) => entry.url === `${site.url}/blog/${post.slug}`)).toBe(true);
    }
  });

  it("builds every URL from the configured site URL", () => {
    const entries = sitemap();
    for (const entry of entries) {
      expect(entry.url.startsWith(site.url)).toBe(true);
    }
  });
});
