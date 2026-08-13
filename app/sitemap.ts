import type { MetadataRoute } from "next";
import { blogPosts, site } from "@/lib/data";

type Route = {
  path: string;
  changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"];
  priority: number;
};

const routes: Route[] = [
  { path: "/", changeFrequency: "monthly", priority: 1 },
  { path: "/admissions", changeFrequency: "monthly", priority: 0.9 },
  { path: "/journey", changeFrequency: "monthly", priority: 0.8 },
  { path: "/safety", changeFrequency: "monthly", priority: 0.8 },
  { path: "/contact", changeFrequency: "monthly", priority: 0.7 },
  { path: "/events", changeFrequency: "weekly", priority: 0.6 },
  { path: "/blog", changeFrequency: "weekly", priority: 0.6 },
  { path: "/portal", changeFrequency: "monthly", priority: 0.3 },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  const staticEntries = routes.map(({ path, changeFrequency, priority }) => ({
    url: `${site.url}${path}`,
    lastModified,
    changeFrequency,
    priority,
  }));

  const blogEntries = blogPosts.map((post) => ({
    url: `${site.url}/blog/${post.slug}`,
    lastModified,
    changeFrequency: "monthly" as const,
    priority: 0.5,
  }));

  return [...staticEntries, ...blogEntries];
}
