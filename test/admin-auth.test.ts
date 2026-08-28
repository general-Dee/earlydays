import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const verifyIdToken = vi.fn();

vi.mock("@/lib/firebase/admin", () => ({
  getAdminAuth: () => ({ verifyIdToken }),
}));

function request(headers: Record<string, string> = {}) {
  return new NextRequest("http://localhost/api/admin/x", { headers });
}

beforeEach(() => {
  vi.clearAllMocks();
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

  it("a global ADMIN_EMAILS email is authorized for any area", async () => {
    process.env.ADMIN_EMAILS = "Staff@Earlydays.example";
    verifyIdToken.mockResolvedValue({ email: "staff@earlydays.example" });
    const { requireAdminEmail } = await import("@/lib/firebase/admin-auth");

    const res = await requireAdminEmail(request({ authorization: "Bearer ok" }), "parents");
    expect(res).toEqual({ email: "staff@earlydays.example" });
  });

  it("an area-scoped email is authorized for its own area", async () => {
    process.env.ADMIN_EMAILS_APPLICATIONS = "frontdesk@earlydays.example";
    verifyIdToken.mockResolvedValue({ email: "frontdesk@earlydays.example" });
    const { requireAdminEmail } = await import("@/lib/firebase/admin-auth");

    const res = await requireAdminEmail(request({ authorization: "Bearer ok" }), "applications");
    expect(res).toEqual({ email: "frontdesk@earlydays.example" });
  });

  it("an area-scoped email is 403'd for a different area", async () => {
    process.env.ADMIN_EMAILS_APPLICATIONS = "frontdesk@earlydays.example";
    verifyIdToken.mockResolvedValue({ email: "frontdesk@earlydays.example" });
    const { requireAdminEmail } = await import("@/lib/firebase/admin-auth");

    const res = await requireAdminEmail(request({ authorization: "Bearer ok" }), "inquiries");
    expect((res as Response).status).toBe(403);
  });

  it("403s an email in nobody's allowlist", async () => {
    process.env.ADMIN_EMAILS = "staff@earlydays.example";
    verifyIdToken.mockResolvedValue({ email: "parent@example.com" });
    const { requireAdminEmail } = await import("@/lib/firebase/admin-auth");

    const res = await requireAdminEmail(request({ authorization: "Bearer ok" }), "applications");
    expect((res as Response).status).toBe(403);
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
