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

  it("hides the archived sample testimonials when the collection is empty", async () => {
    get.mockResolvedValue({ empty: true, docs: [] });

    const { getTestimonials } = await import("@/lib/testimonials");
    expect(await getTestimonials()).toEqual([]);
  });

  it("hides the archived sample testimonials when the live read fails", async () => {
    get.mockRejectedValue(new Error("Firestore unreachable"));
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const { getTestimonials } = await import("@/lib/testimonials");
    expect(await getTestimonials()).toEqual([]);
    consoleSpy.mockRestore();
  });

  it("filters out seeded sample documents from the live collection", async () => {
    get.mockResolvedValue({
      empty: false,
      docs: [{ data: () => ({ id: "seed-1", createdBy: "seed", order: 0 }) }, { data: () => ({ id: "real-1", createdBy: "admin@school", order: 1 }) }],
    });

    const { getTestimonials } = await import("@/lib/testimonials");
    expect(await getTestimonials()).toEqual([{ id: "real-1", createdBy: "admin@school", order: 1 }]);
  });

  it("shows the archived sample testimonials when SHOW_SAMPLE_CONTENT=true", async () => {
    process.env.SHOW_SAMPLE_CONTENT = "true";
    get.mockResolvedValue({ empty: true, docs: [] });

    const { getTestimonials, defaultTestimonials } = await import("@/lib/testimonials");
    expect(await getTestimonials()).toEqual(defaultTestimonials());
  });
});
