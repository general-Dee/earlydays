import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const verifyIdToken = vi.fn();
const generatePasswordResetLink = vi.fn();
const collection = vi.fn();
const doc = vi.fn();
const get = vi.fn();

vi.mock("@/lib/firebase/admin", () => ({
  getAdminAuth: () => ({ verifyIdToken, generatePasswordResetLink }),
  getAdminDb: () => ({ collection }),
}));

const sendParentInviteEmail = vi.fn();
vi.mock("@/lib/email/notify", () => ({
  sendParentInviteEmail: (...args: unknown[]) => sendParentInviteEmail(...args),
}));

collection.mockImplementation(() => ({ doc }));
doc.mockImplementation(() => ({ get }));

function request(headers: Record<string, string> = {}) {
  return new NextRequest("http://localhost/api/admin/parents/u1/resend-invite", { method: "POST", headers });
}

function context(uid = "u1") {
  return { params: { uid } };
}

beforeEach(() => {
  vi.clearAllMocks();
  collection.mockImplementation(() => ({ doc }));
  doc.mockImplementation(() => ({ get }));
  process.env.ADMIN_EMAILS = "staff@earlydays.example";
  verifyIdToken.mockResolvedValue({ email: "staff@earlydays.example" });
});

afterEach(() => {
  delete process.env.ADMIN_EMAILS;
  delete process.env.ADMIN_EMAILS_PARENTS;
});

describe("POST /api/admin/parents/[uid]/resend-invite", () => {
  it("rejects requests without an Authorization header", async () => {
    verifyIdToken.mockReset();
    const { POST } = await import("@/app/api/admin/parents/[uid]/resend-invite/route");
    const res = await POST(request(), context());
    expect(res.status).toBe(401);
  });

  it("403s when the token's email isn't in ADMIN_EMAILS", async () => {
    verifyIdToken.mockResolvedValue({ email: "parent@example.com" });
    const { POST } = await import("@/app/api/admin/parents/[uid]/resend-invite/route");
    const res = await POST(request({ authorization: "Bearer ok" }), context());
    expect(res.status).toBe(403);
    expect(generatePasswordResetLink).not.toHaveBeenCalled();
  });

  it("404s when the parent account doesn't exist", async () => {
    get.mockResolvedValue({ exists: false });
    const { POST } = await import("@/app/api/admin/parents/[uid]/resend-invite/route");
    const res = await POST(request({ authorization: "Bearer ok" }), context());
    expect(res.status).toBe(404);
    expect(generatePasswordResetLink).not.toHaveBeenCalled();
  });

  it("generates a fresh link and emails it to the parent", async () => {
    get.mockResolvedValue({
      exists: true,
      data: () => ({ guardianName: "Aisha Bello", email: "aisha@example.com" }),
    });
    generatePasswordResetLink.mockResolvedValue("https://earlydays.example/reset2");
    sendParentInviteEmail.mockResolvedValue(true);

    const { POST } = await import("@/app/api/admin/parents/[uid]/resend-invite/route");
    const res = await POST(request({ authorization: "Bearer ok" }), context());
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(generatePasswordResetLink).toHaveBeenCalledWith(
      "aisha@example.com",
      expect.objectContaining({ url: expect.any(String) })
    );
    expect(sendParentInviteEmail).toHaveBeenCalledWith(
      { guardianName: "Aisha Bello", email: "aisha@example.com" },
      "https://earlydays.example/reset2"
    );
    expect(json).toEqual({ resetLink: "https://earlydays.example/reset2", emailSent: true });
  });
});
