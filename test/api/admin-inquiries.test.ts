import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const verifyIdToken = vi.fn();
const collection = vi.fn();
const orderBy = vi.fn();
const get = vi.fn();
const add = vi.fn();
const doc = vi.fn(() => ({ get: () => Promise.resolve({ exists: false }) }));

vi.mock("@/lib/firebase/admin", () => ({
  getAdminAuth: () => ({ verifyIdToken }),
  getAdminDb: () => ({ collection }),
}));

collection.mockImplementation(() => ({ orderBy, add, doc }));
orderBy.mockImplementation(() => ({ get }));

function request(headers: Record<string, string> = {}) {
  return new NextRequest("http://localhost/api/admin/inquiries", { headers });
}

function postRequest(headers: Record<string, string> = {}, body?: unknown) {
  return new NextRequest("http://localhost/api/admin/inquiries", {
    method: "POST",
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

const validInquiry = { name: "Aisha", email: "a@b.com", phone: "", message: "Hi" };

beforeEach(() => {
  vi.clearAllMocks();
  collection.mockImplementation(() => ({ orderBy, add, doc }));
  orderBy.mockImplementation(() => ({ get }));
});

afterEach(() => {
  delete process.env.ADMIN_EMAILS;
  delete process.env.ADMIN_EMAILS_INQUIRIES;
});

describe("GET /api/admin/inquiries", () => {
  it("rejects requests without an Authorization header", async () => {
    const { GET } = await import("@/app/api/admin/inquiries/route");
    const res = await GET(request());
    expect(res.status).toBe(401);
  });

  it("rejects an invalid token", async () => {
    verifyIdToken.mockRejectedValue(new Error("bad token"));
    const { GET } = await import("@/app/api/admin/inquiries/route");
    const res = await GET(request({ authorization: "Bearer bad" }));
    expect(res.status).toBe(401);
  });

  it("403s when the token's email isn't in ADMIN_EMAILS", async () => {
    process.env.ADMIN_EMAILS = "staff@earlydays.example";
    verifyIdToken.mockResolvedValue({ email: "parent@example.com" });
    const { GET } = await import("@/app/api/admin/inquiries/route");
    const res = await GET(request({ authorization: "Bearer ok" }));
    expect(res.status).toBe(403);
    expect(get).not.toHaveBeenCalled();
  });

  it("returns inquiries for an allow-listed admin email", async () => {
    process.env.ADMIN_EMAILS = "Staff@Earlydays.example, other@earlydays.example";
    verifyIdToken.mockResolvedValue({ email: "staff@earlydays.example" });
    get.mockResolvedValue({
      docs: [
        { id: "i1", data: () => ({ name: "Aisha", email: "a@b.com", phone: null, message: "Hi", status: "new", createdAt: 2 }) },
        { id: "i2", data: () => ({ name: "Bola", email: null, phone: "0800", message: "Yo", status: "new", createdAt: 1 }) },
      ],
    });

    const { GET } = await import("@/app/api/admin/inquiries/route");
    const res = await GET(request({ authorization: "Bearer ok" }));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.inquiries).toEqual([
      { id: "i1", name: "Aisha", email: "a@b.com", phone: null, message: "Hi", status: "new", createdAt: 2 },
      { id: "i2", name: "Bola", email: null, phone: "0800", message: "Yo", status: "new", createdAt: 1 },
    ]);
    expect(collection).toHaveBeenCalledWith("inquiries");
    expect(orderBy).toHaveBeenCalledWith("createdAt", "desc");
  });

  it("returns inquiries for an email allow-listed only for this area", async () => {
    process.env.ADMIN_EMAILS_INQUIRIES = "frontdesk@earlydays.example";
    verifyIdToken.mockResolvedValue({ email: "frontdesk@earlydays.example" });
    get.mockResolvedValue({ docs: [] });

    const { GET } = await import("@/app/api/admin/inquiries/route");
    const res = await GET(request({ authorization: "Bearer ok" }));

    expect(res.status).toBe(200);
  });
});

describe("POST /api/admin/inquiries", () => {
  it("rejects requests without an Authorization header", async () => {
    const { POST } = await import("@/app/api/admin/inquiries/route");
    const res = await POST(postRequest({}, validInquiry));
    expect(res.status).toBe(401);
  });

  it("403s when the token's email isn't in ADMIN_EMAILS", async () => {
    process.env.ADMIN_EMAILS = "staff@earlydays.example";
    verifyIdToken.mockResolvedValue({ email: "parent@example.com" });
    const { POST } = await import("@/app/api/admin/inquiries/route");
    const res = await POST(postRequest({ authorization: "Bearer ok" }, validInquiry));
    expect(res.status).toBe(403);
    expect(add).not.toHaveBeenCalled();
  });

  it("400s when a required field is missing", async () => {
    process.env.ADMIN_EMAILS = "staff@earlydays.example";
    verifyIdToken.mockResolvedValue({ email: "staff@earlydays.example" });
    const { POST } = await import("@/app/api/admin/inquiries/route");
    const res = await POST(postRequest({ authorization: "Bearer ok" }, { ...validInquiry, message: "" }));
    expect(res.status).toBe(400);
    expect(add).not.toHaveBeenCalled();
  });

  it("400s when neither email nor phone is provided", async () => {
    process.env.ADMIN_EMAILS = "staff@earlydays.example";
    verifyIdToken.mockResolvedValue({ email: "staff@earlydays.example" });
    const { POST } = await import("@/app/api/admin/inquiries/route");
    const res = await POST(postRequest({ authorization: "Bearer ok" }, { ...validInquiry, email: "", phone: "" }));
    expect(res.status).toBe(400);
    expect(add).not.toHaveBeenCalled();
  });

  it("creates an inquiry for an allow-listed admin email", async () => {
    process.env.ADMIN_EMAILS = "staff@earlydays.example";
    verifyIdToken.mockResolvedValue({ email: "staff@earlydays.example" });
    add.mockResolvedValue({ id: "i1" });

    const { POST } = await import("@/app/api/admin/inquiries/route");
    const res = await POST(postRequest({ authorization: "Bearer ok" }, validInquiry));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toMatchObject({
      id: "i1",
      name: validInquiry.name,
      email: validInquiry.email,
      phone: null,
      message: validInquiry.message,
      status: "new",
    });
    expect(typeof json.createdAt).toBe("number");
    expect(collection).toHaveBeenCalledWith("inquiries");
    expect(add).toHaveBeenCalledWith(expect.objectContaining({ status: "new" }));
  });
});
