import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const verifyIdToken = vi.fn();
const collection = vi.fn();
const orderBy = vi.fn();
const get = vi.fn();
const add = vi.fn();

vi.mock("@/lib/firebase/admin", () => ({
  getAdminAuth: () => ({ verifyIdToken }),
  getAdminDb: () => ({ collection }),
}));

collection.mockImplementation(() => ({ orderBy, add }));
orderBy.mockImplementation(() => ({ get }));

function getRequest(headers: Record<string, string> = {}) {
  return new NextRequest("http://localhost/api/admin/announcements", { headers });
}

function postRequest(headers: Record<string, string> = {}, body?: unknown) {
  return new NextRequest("http://localhost/api/admin/announcements", {
    method: "POST",
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  collection.mockImplementation(() => ({ orderBy, add }));
  orderBy.mockImplementation(() => ({ get }));
});

afterEach(() => {
  delete process.env.ADMIN_EMAILS;
  delete process.env.ADMIN_EMAILS_ANNOUNCEMENTS;
});

describe("GET /api/admin/announcements", () => {
  it("rejects requests without an Authorization header", async () => {
    const { GET } = await import("@/app/api/admin/announcements/route");
    const res = await GET(getRequest());
    expect(res.status).toBe(401);
  });

  it("rejects an invalid token", async () => {
    verifyIdToken.mockRejectedValue(new Error("bad token"));
    const { GET } = await import("@/app/api/admin/announcements/route");
    const res = await GET(getRequest({ authorization: "Bearer bad" }));
    expect(res.status).toBe(401);
  });

  it("403s when the token's email isn't in ADMIN_EMAILS", async () => {
    process.env.ADMIN_EMAILS = "staff@earlydays.example";
    verifyIdToken.mockResolvedValue({ email: "parent@example.com" });
    const { GET } = await import("@/app/api/admin/announcements/route");
    const res = await GET(getRequest({ authorization: "Bearer ok" }));
    expect(res.status).toBe(403);
    expect(get).not.toHaveBeenCalled();
  });

  it("returns announcements for an allow-listed admin email", async () => {
    process.env.ADMIN_EMAILS = "staff@earlydays.example";
    verifyIdToken.mockResolvedValue({ email: "staff@earlydays.example" });
    get.mockResolvedValue({
      docs: [
        { id: "a1", data: () => ({ title: "Closed Friday", body: "School closed for a holiday", createdBy: "staff@earlydays.example", createdAt: 2 }) },
      ],
    });

    const { GET } = await import("@/app/api/admin/announcements/route");
    const res = await GET(getRequest({ authorization: "Bearer ok" }));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.announcements).toEqual([
      { id: "a1", title: "Closed Friday", body: "School closed for a holiday", createdBy: "staff@earlydays.example", createdAt: 2 },
    ]);
    expect(collection).toHaveBeenCalledWith("announcements");
    expect(orderBy).toHaveBeenCalledWith("createdAt", "desc");
  });
});

describe("POST /api/admin/announcements", () => {
  it("rejects requests without an Authorization header", async () => {
    const { POST } = await import("@/app/api/admin/announcements/route");
    const res = await POST(postRequest({}, { title: "Hi", body: "Body" }));
    expect(res.status).toBe(401);
  });

  it("403s when the token's email isn't in ADMIN_EMAILS", async () => {
    process.env.ADMIN_EMAILS = "staff@earlydays.example";
    verifyIdToken.mockResolvedValue({ email: "parent@example.com" });
    const { POST } = await import("@/app/api/admin/announcements/route");
    const res = await POST(postRequest({ authorization: "Bearer ok" }, { title: "Hi", body: "Body" }));
    expect(res.status).toBe(403);
    expect(add).not.toHaveBeenCalled();
  });

  it("400s when title or body is missing", async () => {
    process.env.ADMIN_EMAILS = "staff@earlydays.example";
    verifyIdToken.mockResolvedValue({ email: "staff@earlydays.example" });
    const { POST } = await import("@/app/api/admin/announcements/route");
    const res = await POST(postRequest({ authorization: "Bearer ok" }, { title: "  " }));
    expect(res.status).toBe(400);
    expect(add).not.toHaveBeenCalled();
  });

  it("creates an announcement for an allow-listed admin email", async () => {
    process.env.ADMIN_EMAILS = "Staff@Earlydays.example";
    verifyIdToken.mockResolvedValue({ email: "staff@earlydays.example" });
    add.mockResolvedValue({ id: "a1" });

    const { POST } = await import("@/app/api/admin/announcements/route");
    const res = await POST(postRequest({ authorization: "Bearer ok" }, { title: "Closed Friday", body: "School closed for a holiday" }));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toMatchObject({
      id: "a1",
      title: "Closed Friday",
      body: "School closed for a holiday",
      createdBy: "staff@earlydays.example",
    });
    expect(typeof json.createdAt).toBe("number");
    expect(collection).toHaveBeenCalledWith("announcements");
    expect(add).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Closed Friday",
        body: "School closed for a holiday",
        createdBy: "staff@earlydays.example",
      })
    );
  });
});
