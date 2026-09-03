import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const verifyIdToken = vi.fn();
const collection = vi.fn();
const orderBy = vi.fn();
const get = vi.fn();
const doc = vi.fn();
const set = vi.fn();
let docCalls = 0;

vi.mock("@/lib/firebase/admin", () => ({
  getAdminAuth: () => ({ verifyIdToken }),
  getAdminDb: () => ({ collection }),
}));

function resetChain() {
  collection.mockImplementation(() => ({ orderBy, doc }));
  orderBy.mockImplementation(() => ({ get }));
  docCalls = 0;
  doc.mockImplementation(() => (docCalls++ === 0 ? { get: () => Promise.resolve({ exists: false }) } : { id: "t1", set }));
}

function getRequest(headers: Record<string, string> = {}) {
  return new NextRequest("http://localhost/api/admin/testimonials", { headers });
}

const validTestimonial = { quote: "Great school.", name: "Aisha B.", area: "Parent, Barnawa", initial: "A", order: 0 };

function postRequest(headers: Record<string, string> = {}, body?: unknown) {
  return new NextRequest("http://localhost/api/admin/testimonials", {
    method: "POST",
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  resetChain();
  process.env.ADMIN_EMAILS = "staff@earlydays.example";
  verifyIdToken.mockResolvedValue({ email: "staff@earlydays.example" });
  set.mockResolvedValue(undefined);
});

afterEach(() => {
  delete process.env.ADMIN_EMAILS;
  delete process.env.ADMIN_EMAILS_TESTIMONIALS;
});

describe("GET /api/admin/testimonials", () => {
  it("rejects requests without an Authorization header", async () => {
    verifyIdToken.mockReset();
    const { GET } = await import("@/app/api/admin/testimonials/route");
    const res = await GET(getRequest());
    expect(res.status).toBe(401);
  });

  it("403s when the token's email isn't in ADMIN_EMAILS", async () => {
    verifyIdToken.mockResolvedValue({ email: "parent@example.com" });
    const { GET } = await import("@/app/api/admin/testimonials/route");
    const res = await GET(getRequest({ authorization: "Bearer ok" }));
    expect(res.status).toBe(403);
    expect(get).not.toHaveBeenCalled();
  });

  it("returns testimonials ordered by order for an allow-listed admin email", async () => {
    get.mockResolvedValue({
      docs: [{ data: () => ({ id: "t1", ...validTestimonial }) }],
    });

    const { GET } = await import("@/app/api/admin/testimonials/route");
    const res = await GET(getRequest({ authorization: "Bearer ok" }));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.testimonials).toEqual([{ id: "t1", ...validTestimonial }]);
    expect(collection).toHaveBeenCalledWith("testimonials");
    expect(orderBy).toHaveBeenCalledWith("order", "asc");
  });
});

describe("POST /api/admin/testimonials", () => {
  it("rejects requests without an Authorization header", async () => {
    verifyIdToken.mockReset();
    const { POST } = await import("@/app/api/admin/testimonials/route");
    const res = await POST(postRequest({}, validTestimonial));
    expect(res.status).toBe(401);
  });

  it("403s when the token's email isn't in ADMIN_EMAILS", async () => {
    verifyIdToken.mockResolvedValue({ email: "parent@example.com" });
    const { POST } = await import("@/app/api/admin/testimonials/route");
    const res = await POST(postRequest({ authorization: "Bearer ok" }, validTestimonial));
    expect(res.status).toBe(403);
    expect(set).not.toHaveBeenCalled();
  });

  it("400s when a required field is missing", async () => {
    const { POST } = await import("@/app/api/admin/testimonials/route");
    const res = await POST(postRequest({ authorization: "Bearer ok" }, { ...validTestimonial, quote: "" }));
    expect(res.status).toBe(400);
    expect(set).not.toHaveBeenCalled();
  });

  it("400s when the initial exceeds the max length", async () => {
    const { POST } = await import("@/app/api/admin/testimonials/route");
    const res = await POST(postRequest({ authorization: "Bearer ok" }, { ...validTestimonial, initial: "ABC" }));
    expect(res.status).toBe(400);
    expect(set).not.toHaveBeenCalled();
  });

  it("400s when order isn't a whole number", async () => {
    const { POST } = await import("@/app/api/admin/testimonials/route");
    const res = await POST(postRequest({ authorization: "Bearer ok" }, { ...validTestimonial, order: 1.5 }));
    expect(res.status).toBe(400);
    expect(set).not.toHaveBeenCalled();
  });

  it("creates a testimonial for an allow-listed admin email", async () => {
    const { POST } = await import("@/app/api/admin/testimonials/route");
    const res = await POST(postRequest({ authorization: "Bearer ok" }, validTestimonial));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toMatchObject({ id: "t1", ...validTestimonial, createdBy: "staff@earlydays.example" });
    expect(typeof json.createdAt).toBe("number");
    expect(collection).toHaveBeenCalledWith("testimonials");
    expect(set).toHaveBeenCalledWith(
      expect.objectContaining({ id: "t1", ...validTestimonial, createdBy: "staff@earlydays.example" })
    );
  });
});
