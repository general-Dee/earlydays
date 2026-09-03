import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const verifyIdToken = vi.fn();
const getUser = vi.fn();
const collection = vi.fn();
const doc = vi.fn();
const get = vi.fn();

vi.mock("@/lib/firebase/admin", () => ({
  getAdminAuth: () => ({ verifyIdToken, getUser }),
  getAdminDb: () => ({ collection }),
}));

function request(headers: Record<string, string> = {}) {
  return new NextRequest("http://localhost/api/admin/x", { headers });
}

// Default: no adminUsers doc for this uid, so every test falls back to the
// env-var allowlist unless it explicitly opts into a Firestore-backed doc.
function mockNoAdminDoc() {
  collection.mockImplementation(() => ({ doc }));
  doc.mockImplementation(() => ({ get }));
  get.mockResolvedValue({ exists: false });
}

function mockAdminDoc(data: Record<string, unknown>) {
  collection.mockImplementation(() => ({ doc }));
  doc.mockImplementation(() => ({ get }));
  get.mockResolvedValue({ exists: true, data: () => data });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockNoAdminDoc();
  getUser.mockResolvedValue({ disabled: false });
});

afterEach(() => {
  delete process.env.ADMIN_EMAILS;
  delete process.env.ADMIN_EMAILS_APPLICATIONS;
  delete process.env.ADMIN_EMAILS_INQUIRIES;
});

describe("requireAdminEmail", () => {
  it("401s when the Authorization header is missing", async () => {
    const { requireAdminEmail } = await import("@/lib/firebase/admin-auth");
    const res = await requireAdminEmail(request(), "applications");
    expect(res).toBeInstanceOf(Response);
    expect((res as Response).status).toBe(401);
  });

  it("401s on an invalid token", async () => {
    verifyIdToken.mockRejectedValue(new Error("bad token"));
    const { requireAdminEmail } = await import("@/lib/firebase/admin-auth");
    const res = await requireAdminEmail(request({ authorization: "Bearer bad" }), "applications");
    expect((res as Response).status).toBe(401);
  });

  it("a global ADMIN_EMAILS email is authorized for any area (env fallback, no adminUsers doc)", async () => {
    process.env.ADMIN_EMAILS = "Staff@Earlydays.example";
    verifyIdToken.mockResolvedValue({ uid: "u1", email: "staff@earlydays.example" });
    const { requireAdminEmail } = await import("@/lib/firebase/admin-auth");

    const res = await requireAdminEmail(request({ authorization: "Bearer ok" }), "parents");
    expect(res).toEqual({ email: "staff@earlydays.example" });
  });

  it("an area-scoped email is authorized for its own area (env fallback)", async () => {
    process.env.ADMIN_EMAILS_APPLICATIONS = "frontdesk@earlydays.example";
    verifyIdToken.mockResolvedValue({ uid: "u2", email: "frontdesk@earlydays.example" });
    const { requireAdminEmail } = await import("@/lib/firebase/admin-auth");

    const res = await requireAdminEmail(request({ authorization: "Bearer ok" }), "applications");
    expect(res).toEqual({ email: "frontdesk@earlydays.example" });
  });

  it("an area-scoped email is 403'd for a different area (env fallback)", async () => {
    process.env.ADMIN_EMAILS_APPLICATIONS = "frontdesk@earlydays.example";
    verifyIdToken.mockResolvedValue({ uid: "u2", email: "frontdesk@earlydays.example" });
    const { requireAdminEmail } = await import("@/lib/firebase/admin-auth");

    const res = await requireAdminEmail(request({ authorization: "Bearer ok" }), "inquiries");
    expect((res as Response).status).toBe(403);
  });

  it("403s an email in nobody's allowlist and with no adminUsers doc", async () => {
    process.env.ADMIN_EMAILS = "staff@earlydays.example";
    verifyIdToken.mockResolvedValue({ uid: "u3", email: "parent@example.com" });
    const { requireAdminEmail } = await import("@/lib/firebase/admin-auth");

    const res = await requireAdminEmail(request({ authorization: "Bearer ok" }), "applications");
    expect((res as Response).status).toBe(403);
  });

  it("a Firestore adminUsers doc with a matching area authorizes, even without any env var", async () => {
    verifyIdToken.mockResolvedValue({ uid: "u4", email: "blogger@earlydays.example" });
    mockAdminDoc({ isSuperAdmin: false, areas: ["blog", "gallery"] });
    const { requireAdminEmail } = await import("@/lib/firebase/admin-auth");

    const res = await requireAdminEmail(request({ authorization: "Bearer ok" }), "blog");
    expect(res).toEqual({ email: "blogger@earlydays.example" });
  });

  it("a Firestore adminUsers doc without the requested area is 403'd", async () => {
    verifyIdToken.mockResolvedValue({ uid: "u4", email: "blogger@earlydays.example" });
    mockAdminDoc({ isSuperAdmin: false, areas: ["blog"] });
    const { requireAdminEmail } = await import("@/lib/firebase/admin-auth");

    const res = await requireAdminEmail(request({ authorization: "Bearer ok" }), "gallery");
    expect((res as Response).status).toBe(403);
  });

  it("a Firestore superadmin doc is authorized for any area", async () => {
    verifyIdToken.mockResolvedValue({ uid: "u5", email: "boss@earlydays.example" });
    mockAdminDoc({ isSuperAdmin: true, areas: [] });
    const { requireAdminEmail } = await import("@/lib/firebase/admin-auth");

    const res = await requireAdminEmail(request({ authorization: "Bearer ok" }), "payments");
    expect(res).toEqual({ email: "boss@earlydays.example" });
  });

  it("403s a disabled admin even though their adminUsers doc grants the area", async () => {
    verifyIdToken.mockResolvedValue({ uid: "u6", email: "gone@earlydays.example" });
    mockAdminDoc({ isSuperAdmin: false, areas: ["blog"] });
    getUser.mockResolvedValue({ disabled: true });
    const { requireAdminEmail } = await import("@/lib/firebase/admin-auth");

    const res = await requireAdminEmail(request({ authorization: "Bearer ok" }), "blog");
    expect((res as Response).status).toBe(403);
  });
});

describe("requireSuperAdmin", () => {
  it("401s when the Authorization header is missing", async () => {
    const { requireSuperAdmin } = await import("@/lib/firebase/admin-auth");
    const res = await requireSuperAdmin(request());
    expect((res as Response).status).toBe(401);
  });

  it("403s an area-scoped (non-superadmin) admin", async () => {
    verifyIdToken.mockResolvedValue({ uid: "u4", email: "blogger@earlydays.example" });
    mockAdminDoc({ isSuperAdmin: false, areas: ["blog"] });
    const { requireSuperAdmin } = await import("@/lib/firebase/admin-auth");

    const res = await requireSuperAdmin(request({ authorization: "Bearer ok" }));
    expect((res as Response).status).toBe(403);
  });

  it("403s an env-var area-scoped admin (env fallback never grants superadmin for area vars)", async () => {
    process.env.ADMIN_EMAILS_APPLICATIONS = "frontdesk@earlydays.example";
    verifyIdToken.mockResolvedValue({ uid: "u2", email: "frontdesk@earlydays.example" });
    const { requireSuperAdmin } = await import("@/lib/firebase/admin-auth");

    const res = await requireSuperAdmin(request({ authorization: "Bearer ok" }));
    expect((res as Response).status).toBe(403);
  });

  it("authorizes a Firestore superadmin and returns their identity", async () => {
    verifyIdToken.mockResolvedValue({ uid: "u5", email: "boss@earlydays.example" });
    mockAdminDoc({ isSuperAdmin: true, areas: [] });
    const { requireSuperAdmin } = await import("@/lib/firebase/admin-auth");

    const res = await requireSuperAdmin(request({ authorization: "Bearer ok" }));
    expect(res).toEqual({ uid: "u5", email: "boss@earlydays.example", isSuperAdmin: true, areas: [] });
  });

  it("authorizes a global ADMIN_EMAILS email as an implicit superadmin (env fallback)", async () => {
    process.env.ADMIN_EMAILS = "staff@earlydays.example";
    verifyIdToken.mockResolvedValue({ uid: "u1", email: "staff@earlydays.example" });
    const { requireSuperAdmin } = await import("@/lib/firebase/admin-auth");

    const res = await requireSuperAdmin(request({ authorization: "Bearer ok" }));
    expect(res).toEqual({ uid: "u1", email: "staff@earlydays.example", isSuperAdmin: true, areas: [] });
  });
});

describe("requireAuthenticatedUser", () => {
  it("401s when the Authorization header is missing", async () => {
    const { requireAuthenticatedUser } = await import("@/lib/firebase/admin-auth");
    const res = await requireAuthenticatedUser(request());
    expect(res).toBeInstanceOf(Response);
    expect((res as Response).status).toBe(401);
  });

  it("401s on an invalid token", async () => {
    verifyIdToken.mockRejectedValue(new Error("bad token"));
    const { requireAuthenticatedUser } = await import("@/lib/firebase/admin-auth");
    const res = await requireAuthenticatedUser(request({ authorization: "Bearer bad" }));
    expect((res as Response).status).toBe(401);
  });

  it("returns the uid for a valid token", async () => {
    verifyIdToken.mockResolvedValue({ uid: "u1", email: "p@example.com" });
    const { requireAuthenticatedUser } = await import("@/lib/firebase/admin-auth");

    const res = await requireAuthenticatedUser(request({ authorization: "Bearer ok" }));
    expect(res).toEqual({ uid: "u1" });
  });
});
