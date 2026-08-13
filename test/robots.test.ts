import { describe, expect, it } from "vitest";
import robots from "@/app/robots";
import { site } from "@/lib/data";

describe("robots", () => {
  it("disallows the API routes", () => {
    const result = robots();
    expect(result.rules).toMatchObject({ userAgent: "*", disallow: "/api/" });
  });

  it("points to the sitemap on the configured site URL", () => {
    const result = robots();
    expect(result.sitemap).toBe(`${site.url}/sitemap.xml`);
  });
});
