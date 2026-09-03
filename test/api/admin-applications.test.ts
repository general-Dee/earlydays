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
  return new NextRequest("http://localhost/api/admin/applications", { headers });
}

function postRequest(headers: Record<string, string> = {}, body?: unknown) {
  return new NextRequest("http://localhost/api/admin/applications", {
    method: "POST",
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

const validApplication = {
  childName: "Femi",
  childDob: "2021-03-01",
  desiredStage: "CR",
  guardianName: "Aisha",
  email: "a@b.com",
  phone: "",
  notes: "",
};

beforeEach(() => {
  vi.clearAllMocks();
  collection.mockImplementation(() => ({ orderBy, add, doc }));
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

describe("POST /api/admin/applications", () => {
  it("rejects requests without an Authorization header", async () => {
    const { POST } = await import("@/app/api/admin/applications/route");
    const res = await POST(postRequest({}, validApplication));
    expect(res.status).toBe(401);
  });

  it("403s when the token's email isn't in ADMIN_EMAILS", async () => {
    process.env.ADMIN_EMAILS = "staff@earlydays.example";
    verifyIdToken.mockResolvedValue({ email: "parent@example.com" });
    const { POST } = await import("@/app/api/admin/applications/route");
    const res = await POST(postRequest({ authorization: "Bearer ok" }, validApplication));
    expect(res.status).toBe(403);
    expect(add).not.toHaveBeenCalled();
  });

  it("400s when a required field is missing", async () => {
    process.env.ADMIN_EMAILS = "staff@earlydays.example";
    verifyIdToken.mockResolvedValue({ email: "staff@earlydays.example" });
    const { POST } = await import("@/app/api/admin/applications/route");
    const res = await POST(postRequest({ authorization: "Bearer ok" }, { ...validApplication, childName: "" }));
    expect(res.status).toBe(400);
    expect(add).not.toHaveBeenCalled();
  });

  it("400s when neither email nor phone is provided", async () => {
    process.env.ADMIN_EMAILS = "staff@earlydays.example";
    verifyIdToken.mockResolvedValue({ email: "staff@earlydays.example" });
    const { POST } = await import("@/app/api/admin/applications/route");
    const res = await POST(
      postRequest({ authorization: "Bearer ok" }, { ...validApplication, email: "", phone: "" })
    );
    expect(res.status).toBe(400);
    expect(add).not.toHaveBeenCalled();
  });

  it("400s when the desired stage isn't a valid code", async () => {
    process.env.ADMIN_EMAILS = "staff@earlydays.example";
    verifyIdToken.mockResolvedValue({ email: "staff@earlydays.example" });
    const { POST } = await import("@/app/api/admin/applications/route");
    const res = await POST(
      postRequest({ authorization: "Bearer ok" }, { ...validApplication, desiredStage: "NOT_A_STAGE" })
    );
    expect(res.status).toBe(400);
    expect(add).not.toHaveBeenCalled();
  });

  it("creates an application for an allow-listed admin email", async () => {
    process.env.ADMIN_EMAILS = "staff@earlydays.example";
    verifyIdToken.mockResolvedValue({ email: "staff@earlydays.example" });
    add.mockResolvedValue({ id: "a1" });

    const { POST } = await import("@/app/api/admin/applications/route");
    const res = await POST(postRequest({ authorization: "Bearer ok" }, validApplication));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toMatchObject({
      id: "a1",
      childName: validApplication.childName,
      childDob: validApplication.childDob,
      desiredStage: validApplication.desiredStage,
      guardianName: validApplication.guardianName,
      email: validApplication.email,
      phone: null,
      notes: "",
      status: "new",
    });
    expect(typeof json.referenceCode).toBe("string");
    expect(json.referenceCode).toHaveLength(8);
    expect(typeof json.createdAt).toBe("number");
    expect(collection).toHaveBeenCalledWith("applications");
    expect(add).toHaveBeenCalledWith(expect.objectContaining({ status: "new" }));
  });
});
