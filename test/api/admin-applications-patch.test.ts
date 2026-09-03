import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const verifyIdToken = vi.fn();
const collection = vi.fn();
const doc = vi.fn();
const update = vi.fn();
const get = vi.fn();
let docCalls = 0;

vi.mock("@/lib/firebase/admin", () => ({
  getAdminAuth: () => ({ verifyIdToken }),
  getAdminDb: () => ({ collection }),
}));

const sendApplicationStatusEmail = vi.fn();
vi.mock("@/lib/email/notify", () => ({
  sendApplicationStatusEmail: (...args: unknown[]) => sendApplicationStatusEmail(...args),
}));

collection.mockImplementation(() => ({ doc }));
doc.mockImplementation(() => (docCalls++ === 0 ? { get: () => Promise.resolve({ exists: false }) } : { update, get }));

const sampleApplication = {
  childName: "Zainab Bello",
  guardianName: "Aisha Bello",
  desiredStage: "CR",
  email: "aisha@example.com",
};

function request(headers: Record<string, string> = {}, body?: unknown) {
  return new NextRequest("http://localhost/api/admin/applications/a1", {
    method: "PATCH",
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

function context(id = "a1") {
  return { params: { id } };
}

beforeEach(() => {
  vi.clearAllMocks();
  collection.mockImplementation(() => ({ doc }));
  docCalls = 0;
  doc.mockImplementation(() => (docCalls++ === 0 ? { get: () => Promise.resolve({ exists: false }) } : { update, get }));
  update.mockResolvedValue(undefined);
  get.mockResolvedValue({ exists: true, data: () => sampleApplication });
  sendApplicationStatusEmail.mockResolvedValue(true);
});

afterEach(() => {
  delete process.env.ADMIN_EMAILS;
  delete process.env.ADMIN_EMAILS_APPLICATIONS;
});

describe("PATCH /api/admin/applications/[id]", () => {
  it("rejects requests without an Authorization header", async () => {
    const { PATCH } = await import("@/app/api/admin/applications/[id]/route");
    const res = await PATCH(request({}, { status: "reviewing" }), context());
    expect(res.status).toBe(401);
  });

  it("rejects an invalid token", async () => {
    verifyIdToken.mockRejectedValue(new Error("bad token"));
    const { PATCH } = await import("@/app/api/admin/applications/[id]/route");
    const res = await PATCH(request({ authorization: "Bearer bad" }, { status: "reviewing" }), context());
    expect(res.status).toBe(401);
  });

  it("403s when the token's email isn't in ADMIN_EMAILS", async () => {
    process.env.ADMIN_EMAILS = "staff@earlydays.example";
    verifyIdToken.mockResolvedValue({ email: "parent@example.com" });
    const { PATCH } = await import("@/app/api/admin/applications/[id]/route");
    const res = await PATCH(
      request({ authorization: "Bearer ok" }, { status: "reviewing" }),
      context()
    );
    expect(res.status).toBe(403);
    expect(update).not.toHaveBeenCalled();
  });

  it("400s on a missing status", async () => {
    process.env.ADMIN_EMAILS = "staff@earlydays.example";
    verifyIdToken.mockResolvedValue({ email: "staff@earlydays.example" });
    const { PATCH } = await import("@/app/api/admin/applications/[id]/route");
    const res = await PATCH(request({ authorization: "Bearer ok" }, {}), context());
    expect(res.status).toBe(400);
    expect(update).not.toHaveBeenCalled();
  });

  it("400s on an invalid status", async () => {
    process.env.ADMIN_EMAILS = "staff@earlydays.example";
    verifyIdToken.mockResolvedValue({ email: "staff@earlydays.example" });
    const { PATCH } = await import("@/app/api/admin/applications/[id]/route");
    const res = await PATCH(
      request({ authorization: "Bearer ok" }, { status: "archived" }),
      context()
    );
    expect(res.status).toBe(400);
    expect(update).not.toHaveBeenCalled();
  });

  it("updates the application's status for an allow-listed admin email", async () => {
    process.env.ADMIN_EMAILS = "Staff@Earlydays.example";
    verifyIdToken.mockResolvedValue({ email: "staff@earlydays.example" });
    const { PATCH } = await import("@/app/api/admin/applications/[id]/route");
    const res = await PATCH(
      request({ authorization: "Bearer ok" }, { status: "accepted" }),
      context("a1")
    );
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toEqual({ ok: true, emailSent: true });
    expect(collection).toHaveBeenCalledWith("applications");
    expect(doc).toHaveBeenCalledWith("a1");
    expect(update).toHaveBeenCalledWith({ status: "accepted" });
    expect(sendApplicationStatusEmail).toHaveBeenCalledWith(
      {
        guardianName: "Aisha Bello",
        childName: "Zainab Bello",
        desiredStage: "CR",
        email: "aisha@example.com",
      },
      "accepted"
    );
  });

  it("404s when the application doesn't exist", async () => {
    process.env.ADMIN_EMAILS = "staff@earlydays.example";
    verifyIdToken.mockResolvedValue({ email: "staff@earlydays.example" });
    get.mockResolvedValue({ exists: false });
    const { PATCH } = await import("@/app/api/admin/applications/[id]/route");
    const res = await PATCH(
      request({ authorization: "Bearer ok" }, { status: "accepted" }),
      context("a1")
    );

    expect(res.status).toBe(404);
    expect(update).not.toHaveBeenCalled();
    expect(sendApplicationStatusEmail).not.toHaveBeenCalled();
  });

  it("still succeeds if sending the status email fails", async () => {
    process.env.ADMIN_EMAILS = "staff@earlydays.example";
    verifyIdToken.mockResolvedValue({ email: "staff@earlydays.example" });
    sendApplicationStatusEmail.mockRejectedValue(new Error("resend down"));
    const { PATCH } = await import("@/app/api/admin/applications/[id]/route");
    const res = await PATCH(
      request({ authorization: "Bearer ok" }, { status: "declined" }),
      context("a1")
    );
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toEqual({ ok: true, emailSent: false });
    expect(update).toHaveBeenCalledWith({ status: "declined" });
  });
});
