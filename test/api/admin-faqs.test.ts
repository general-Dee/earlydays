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
  doc.mockImplementation(() => (docCalls++ === 0 ? { get: () => Promise.resolve({ exists: false }) } : { id: "f1", set }));
}

function getRequest(headers: Record<string, string> = {}) {
  return new NextRequest("http://localhost/api/admin/faqs", { headers });
}

const validFaq = { question: "What ages do you take?", answer: "Creche through Primary 6.", order: 0 };

function postRequest(headers: Record<string, string> = {}, body?: unknown) {
  return new NextRequest("http://localhost/api/admin/faqs", {
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
  delete process.env.ADMIN_EMAILS_FAQS;
});

describe("GET /api/admin/faqs", () => {
  it("rejects requests without an Authorization header", async () => {
    verifyIdToken.mockReset();
    const { GET } = await import("@/app/api/admin/faqs/route");
    const res = await GET(getRequest());
    expect(res.status).toBe(401);
  });

  it("403s when the token's email isn't in ADMIN_EMAILS", async () => {
    verifyIdToken.mockResolvedValue({ email: "parent@example.com" });
    const { GET } = await import("@/app/api/admin/faqs/route");
    const res = await GET(getRequest({ authorization: "Bearer ok" }));
    expect(res.status).toBe(403);
    expect(get).not.toHaveBeenCalled();
  });

  it("returns FAQs ordered by order for an allow-listed admin email", async () => {
    get.mockResolvedValue({
      docs: [{ data: () => ({ id: "f1", ...validFaq }) }],
    });

    const { GET } = await import("@/app/api/admin/faqs/route");
    const res = await GET(getRequest({ authorization: "Bearer ok" }));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.faqs).toEqual([{ id: "f1", ...validFaq }]);
    expect(collection).toHaveBeenCalledWith("faqs");
    expect(orderBy).toHaveBeenCalledWith("order", "asc");
  });
});

describe("POST /api/admin/faqs", () => {
  it("403s when the token's email isn't in ADMIN_EMAILS", async () => {
    verifyIdToken.mockResolvedValue({ email: "parent@example.com" });
    const { POST } = await import("@/app/api/admin/faqs/route");
    const res = await POST(postRequest({ authorization: "Bearer ok" }, validFaq));
    expect(res.status).toBe(403);
    expect(set).not.toHaveBeenCalled();
  });

  it("400s when a required field is missing", async () => {
    const { POST } = await import("@/app/api/admin/faqs/route");
    const res = await POST(postRequest({ authorization: "Bearer ok" }, { ...validFaq, question: "" }));
    expect(res.status).toBe(400);
    expect(set).not.toHaveBeenCalled();
  });

  it("400s when order isn't a whole number", async () => {
    const { POST } = await import("@/app/api/admin/faqs/route");
    const res = await POST(postRequest({ authorization: "Bearer ok" }, { ...validFaq, order: 1.5 }));
    expect(res.status).toBe(400);
    expect(set).not.toHaveBeenCalled();
  });

  it("creates a FAQ for an allow-listed admin email", async () => {
    const { POST } = await import("@/app/api/admin/faqs/route");
    const res = await POST(postRequest({ authorization: "Bearer ok" }, validFaq));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toMatchObject({ id: "f1", ...validFaq, createdBy: "staff@earlydays.example" });
    expect(typeof json.createdAt).toBe("number");
    expect(collection).toHaveBeenCalledWith("faqs");
    expect(set).toHaveBeenCalledWith(
      expect.objectContaining({ id: "f1", ...validFaq, createdBy: "staff@earlydays.example" })
    );
  });
});
