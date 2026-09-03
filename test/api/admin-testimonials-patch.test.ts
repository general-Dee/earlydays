import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const verifyIdToken = vi.fn();
const collection = vi.fn();
const doc = vi.fn();
const get = vi.fn();
const update = vi.fn();
let docCalls = 0;

vi.mock("@/lib/firebase/admin", () => ({
  getAdminAuth: () => ({ verifyIdToken }),
  getAdminDb: () => ({ collection }),
}));

const existingTestimonial = {
  id: "t1",
  quote: "Great school.",
  name: "Aisha B.",
  area: "Parent, Barnawa",
  initial: "A",
  order: 0,
  createdBy: "staff@earlydays.example",
  createdAt: 1,
};

function resetChain() {
  collection.mockImplementation(() => ({ doc }));
  docCalls = 0;
  doc.mockImplementation(() => (docCalls++ === 0 ? { get: () => Promise.resolve({ exists: false }) } : { get, update }));
}

function request(headers: Record<string, string>, body?: unknown) {
  return new NextRequest("http://localhost/api/admin/testimonials/t1", {
    method: "PATCH",
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

function context(id = "t1") {
  return { params: { id } };
}

beforeEach(() => {
  vi.clearAllMocks();
  resetChain();
  process.env.ADMIN_EMAILS = "staff@earlydays.example";
  verifyIdToken.mockResolvedValue({ email: "staff@earlydays.example" });
  get.mockResolvedValue({ exists: true, data: () => existingTestimonial });
  update.mockResolvedValue(undefined);
});

afterEach(() => {
  delete process.env.ADMIN_EMAILS;
  delete process.env.ADMIN_EMAILS_TESTIMONIALS;
});

describe("PATCH /api/admin/testimonials/[id]", () => {
  it("rejects requests without an Authorization header", async () => {
    verifyIdToken.mockReset();
    const { PATCH } = await import("@/app/api/admin/testimonials/[id]/route");
    const res = await PATCH(request({}, { name: "New Name" }), context());
    expect(res.status).toBe(401);
  });

  it("403s when the token's email isn't authorized", async () => {
    verifyIdToken.mockResolvedValue({ email: "parent@example.com" });
    const { PATCH } = await import("@/app/api/admin/testimonials/[id]/route");
    const res = await PATCH(request({ authorization: "Bearer ok" }, { name: "New Name" }), context());
    expect(res.status).toBe(403);
    expect(update).not.toHaveBeenCalled();
  });

  it("404s when the testimonial doesn't exist", async () => {
    get.mockResolvedValue({ exists: false });
    const { PATCH } = await import("@/app/api/admin/testimonials/[id]/route");
    const res = await PATCH(request({ authorization: "Bearer ok" }, { name: "New Name" }), context());
    expect(res.status).toBe(404);
  });

  it("400s on an invalid order", async () => {
    const { PATCH } = await import("@/app/api/admin/testimonials/[id]/route");
    const res = await PATCH(request({ authorization: "Bearer ok" }, { order: 1.5 }), context());
    expect(res.status).toBe(400);
    expect(update).not.toHaveBeenCalled();
  });

  it("400s when the updated initial exceeds the max length", async () => {
    const { PATCH } = await import("@/app/api/admin/testimonials/[id]/route");
    const res = await PATCH(request({ authorization: "Bearer ok" }, { initial: "ABC" }), context());
    expect(res.status).toBe(400);
    expect(update).not.toHaveBeenCalled();
  });

  it("updates provided fields and returns the merged testimonial", async () => {
    const { PATCH } = await import("@/app/api/admin/testimonials/[id]/route");
    const res = await PATCH(request({ authorization: "Bearer ok" }, { name: "New Name", quote: "Updated quote." }), context());
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ name: "New Name", quote: "Updated quote." }));
    expect(json).toMatchObject({ id: "t1", name: "New Name", quote: "Updated quote.", area: existingTestimonial.area });
  });
});
