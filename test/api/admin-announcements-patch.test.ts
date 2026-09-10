import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const verifyIdToken = vi.fn();
const getUser = vi.fn();
const collection = vi.fn();
const doc = vi.fn();
const get = vi.fn();
const update = vi.fn();
let docCalls = 0;

vi.mock("@/lib/firebase/admin", () => ({
  getAdminAuth: () => ({ verifyIdToken, getUser }),
  getAdminDb: () => ({ collection }),
}));

const existingAnnouncement = {
  id: "a1",
  title: "Closed Friday",
  body: "School closed for a holiday.",
  createdBy: "staff@earlydays.example",
  createdAt: 1,
};

function resetChain() {
  collection.mockImplementation(() => ({ doc }));
  docCalls = 0;
  doc.mockImplementation(() => (docCalls++ === 0 ? { get: () => Promise.resolve({ exists: false }) } : { get, update }));
}

function request(headers: Record<string, string>, body?: unknown) {
  return new NextRequest("http://localhost/api/admin/announcements/a1", {
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
  getUser.mockResolvedValue({ disabled: false });
  resetChain();
  process.env.ADMIN_EMAILS = "staff@earlydays.example";
  verifyIdToken.mockResolvedValue({ email: "staff@earlydays.example" });
  get.mockResolvedValue({ exists: true, data: () => existingAnnouncement });
  update.mockResolvedValue(undefined);
});

afterEach(() => {
  delete process.env.ADMIN_EMAILS;
  delete process.env.ADMIN_EMAILS_ANNOUNCEMENTS;
});

describe("PATCH /api/admin/announcements/[id]", () => {
  it("rejects requests without an Authorization header", async () => {
    verifyIdToken.mockReset();
    const { PATCH } = await import("@/app/api/admin/announcements/[id]/route");
    const res = await PATCH(request({}, { title: "New title" }), context());
    expect(res.status).toBe(401);
  });

  it("403s when the token's email isn't authorized", async () => {
    verifyIdToken.mockResolvedValue({ email: "parent@example.com" });
    const { PATCH } = await import("@/app/api/admin/announcements/[id]/route");
    const res = await PATCH(request({ authorization: "Bearer ok" }, { title: "New title" }), context());
    expect(res.status).toBe(403);
    expect(update).not.toHaveBeenCalled();
  });

  it("404s when the announcement doesn't exist", async () => {
    get.mockResolvedValue({ exists: false });
    const { PATCH } = await import("@/app/api/admin/announcements/[id]/route");
    const res = await PATCH(request({ authorization: "Bearer ok" }, { title: "New title" }), context());
    expect(res.status).toBe(404);
  });

  it("400s when the updated title exceeds the max length", async () => {
    const { PATCH } = await import("@/app/api/admin/announcements/[id]/route");
    const res = await PATCH(request({ authorization: "Bearer ok" }, { title: "x".repeat(201) }), context());
    expect(res.status).toBe(400);
    expect(update).not.toHaveBeenCalled();
  });

  it("400s when the updated body exceeds the max length", async () => {
    const { PATCH } = await import("@/app/api/admin/announcements/[id]/route");
    const res = await PATCH(request({ authorization: "Bearer ok" }, { body: "x".repeat(2001) }), context());
    expect(res.status).toBe(400);
    expect(update).not.toHaveBeenCalled();
  });

  it("updates provided fields and returns the merged announcement", async () => {
    const { PATCH } = await import("@/app/api/admin/announcements/[id]/route");
    const res = await PATCH(
      request({ authorization: "Bearer ok" }, { title: "Updated title" }),
      context()
    );
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ title: "Updated title" }));
    expect(json).toMatchObject({ id: "a1", title: "Updated title", body: existingAnnouncement.body });
  });
});
