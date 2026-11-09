import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const collection = vi.fn();
const orderBy = vi.fn();
const get = vi.fn();

vi.mock("@/lib/firebase/admin", () => ({
  getAdminDb: () => ({ collection }),
}));

beforeEach(() => {
  vi.clearAllMocks();
  collection.mockImplementation(() => ({ orderBy }));
  orderBy.mockImplementation(() => ({ get }));
});

afterEach(() => {
  vi.resetModules();
  delete process.env.SHOW_SAMPLE_CONTENT;
});

describe("getBlogPosts", () => {
  it("returns the live posts when the collection has documents", async () => {
    get.mockResolvedValue({
      empty: false,
      docs: [{ data: () => ({ id: "p1", slug: "real-post", title: "Real Post", order: 0 }) }],
    });

    const { getBlogPosts } = await import("@/lib/blogPosts");
    const posts = await getBlogPosts();

    expect(posts).toEqual([{ id: "p1", slug: "real-post", title: "Real Post", order: 0 }]);
    expect(collection).toHaveBeenCalledWith("blog");
    expect(orderBy).toHaveBeenCalledWith("order", "asc");
  });

  it("hides the archived sample posts when the collection is empty", async () => {
    get.mockResolvedValue({ empty: true, docs: [] });

    const { getBlogPosts } = await import("@/lib/blogPosts");
    expect(await getBlogPosts()).toEqual([]);
  });

  it("hides the archived sample posts when the live read fails", async () => {
    get.mockRejectedValue(new Error("Firestore unreachable"));
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const { getBlogPosts } = await import("@/lib/blogPosts");
    expect(await getBlogPosts()).toEqual([]);
    consoleSpy.mockRestore();
  });

  it("filters out seeded sample documents from the live collection", async () => {
    get.mockResolvedValue({
      empty: false,
      docs: [{ data: () => ({ id: "seed-1", createdBy: "seed", order: 0 }) }, { data: () => ({ id: "real-1", createdBy: "admin@school", order: 1 }) }],
    });

    const { getBlogPosts } = await import("@/lib/blogPosts");
    expect(await getBlogPosts()).toEqual([{ id: "real-1", createdBy: "admin@school", order: 1 }]);
  });

  it("shows the archived sample posts when SHOW_SAMPLE_CONTENT=true", async () => {
    process.env.SHOW_SAMPLE_CONTENT = "true";
    get.mockResolvedValue({ empty: true, docs: [] });

    const { getBlogPosts, defaultBlogPosts } = await import("@/lib/blogPosts");
    expect(await getBlogPosts()).toEqual(defaultBlogPosts());
  });
});
