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
  return new NextRequest("http://localhost/api/admin/applications", { headers });
}

beforeEach(() => {
  vi.clearAllMocks();
  collection.mockImplementation(() => ({ orderBy }));
  orderBy.mockImplementation(() => ({ get }));
});

afterEach(() => {
  delete process.env.ADMIN_EMAILS;
  delete process.env.ADMIN_EMAILS_APPLICATIONS;
});

describe("GET /api/admin/applications", () => {
  it("rejects requests without an Authorization header", async () => {
    const { GET } = await import("@/app/api/admin/applications/route");
    const res = await GET(request());
    expect(res.status).toBe(401);
  });

  it("rejects an invalid token", async () => {
    verifyIdToken.mockRejectedValue(new Error("bad token"));
    const { GET } = await import("@/app/api/admin/applications/route");
    const res = await GET(request({ authorization: "Bearer bad" }));
    expect(res.status).toBe(401);
  });

  it("403s when the token's email isn't in ADMIN_EMAILS", async () => {
    process.env.ADMIN_EMAILS = "staff@earlydays.example";
    verifyIdToken.mockResolvedValue({ email: "parent@example.com" });
    const { GET } = await import("@/app/api/admin/applications/route");
    const res = await GET(request({ authorization: "Bearer ok" }));
    expect(res.status).toBe(403);
    expect(get).not.toHaveBeenCalled();
  });

  it("returns applications for an allow-listed admin email", async () => {
    process.env.ADMIN_EMAILS = "Staff@Earlydays.example, other@earlydays.example";
    verifyIdToken.mockResolvedValue({ email: "staff@earlydays.example" });
    get.mockResolvedValue({
      docs: [
        {
          id: "a1",
          data: () => ({
            childName: "Femi",
            childDob: "2021-03-01",
            desiredStage: "CR",
            guardianName: "Aisha",
            email: "a@b.com",
            phone: null,
            notes: "",
            status: "new",
            createdAt: 2,
          }),
        },
        {
          id: "a2",
          data: () => ({
            childName: "Bola",
            childDob: "2020-01-01",
            desiredStage: "N1",
            guardianName: "Chidi",
            email: null,
            phone: "0800",
            notes: "",
            status: "new",
            createdAt: 1,
          }),
        },
      ],
    });

    const { GET } = await import("@/app/api/admin/applications/route");
    const res = await GET(request({ authorization: "Bearer ok" }));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.applications).toEqual([
      {
        id: "a1",
        childName: "Femi",
        childDob: "2021-03-01",
        desiredStage: "CR",
        guardianName: "Aisha",
        email: "a@b.com",
        phone: null,
        notes: "",
        status: "new",
        createdAt: 2,
      },
      {
        id: "a2",
        childName: "Bola",
        childDob: "2020-01-01",
        desiredStage: "N1",
        guardianName: "Chidi",
        email: null,
        phone: "0800",
        notes: "",
        status: "new",
        createdAt: 1,
      },
    ]);
    expect(collection).toHaveBeenCalledWith("applications");
    expect(orderBy).toHaveBeenCalledWith("createdAt", "desc");
  });

  it("returns applications for an email allow-listed only for this area", async () => {
    process.env.ADMIN_EMAILS_APPLICATIONS = "frontdesk@earlydays.example";
    verifyIdToken.mockResolvedValue({ email: "frontdesk@earlydays.example" });
    get.mockResolvedValue({ docs: [] });

    const { GET } = await import("@/app/api/admin/applications/route");
    const res = await GET(request({ authorization: "Bearer ok" }));

    expect(res.status).toBe(200);
  });
});
