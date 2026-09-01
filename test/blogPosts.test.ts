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

  it("falls back to the sample posts when the collection is empty", async () => {
    get.mockResolvedValue({ empty: true, docs: [] });

    const { getBlogPosts, defaultBlogPosts } = await import("@/lib/blogPosts");
    const posts = await getBlogPosts();

    expect(posts).toEqual(defaultBlogPosts());
  });

  it("falls back to the sample posts when the live read fails", async () => {
    get.mockRejectedValue(new Error("Firestore unreachable"));
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const { getBlogPosts, defaultBlogPosts } = await import("@/lib/blogPosts");
    const posts = await getBlogPosts();

    expect(posts).toEqual(defaultBlogPosts());
    consoleSpy.mockRestore();
  });
});
