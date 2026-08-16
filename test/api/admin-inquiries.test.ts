import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const verifyIdToken = vi.fn();
const collection = vi.fn();
const orderBy = vi.fn();
const get = vi.fn();

vi.mock("@/lib/firebase/admin", () => ({
  getAdminAuth: () => ({ verifyIdToken }),
  getAdminDb: () => ({ collection }),
}));

collection.mockImplementation(() => ({ orderBy }));
orderBy.mockImplementation(() => ({ get }));

function request(headers: Record<string, string> = {}) {
  return new NextRequest("http://localhost/api/admin/inquiries", { headers });
}

beforeEach(() => {
  vi.clearAllMocks();
  collection.mockImplementation(() => ({ orderBy }));
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
