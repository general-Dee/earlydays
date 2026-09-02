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

describe("getTestimonials", () => {
  it("returns the live testimonials when the collection has documents", async () => {
    get.mockResolvedValue({
      empty: false,
      docs: [{ data: () => ({ id: "t1", quote: "Real quote", name: "Real Name", area: "Parent", initial: "R", order: 0 }) }],
    });

    const { getTestimonials } = await import("@/lib/testimonials");
    const testimonials = await getTestimonials();

    expect(testimonials).toEqual([
      { id: "t1", quote: "Real quote", name: "Real Name", area: "Parent", initial: "R", order: 0 },
    ]);
    expect(collection).toHaveBeenCalledWith("testimonials");
    expect(orderBy).toHaveBeenCalledWith("order", "asc");
  });

  it("falls back to the sample testimonials when the collection is empty", async () => {
    get.mockResolvedValue({ empty: true, docs: [] });

    const { getTestimonials, defaultTestimonials } = await import("@/lib/testimonials");
    const testimonials = await getTestimonials();

    expect(testimonials).toEqual(defaultTestimonials());
  });

  it("falls back to the sample testimonials when the live read fails", async () => {
    get.mockRejectedValue(new Error("Firestore unreachable"));
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const { getTestimonials, defaultTestimonials } = await import("@/lib/testimonials");
    const testimonials = await getTestimonials();

    expect(testimonials).toEqual(defaultTestimonials());
    consoleSpy.mockRestore();
  });
});
