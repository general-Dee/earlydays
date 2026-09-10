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

const existingEvent = {
  id: "e1",
  title: "Sports Day",
  date: "2026-11-01",
  tag: "All Stages",
  desc: "Annual sports day on the school field.",
  createdBy: "staff@earlydays.example",
  createdAt: 1,
};

function resetChain() {
  collection.mockImplementation(() => ({ doc }));
  docCalls = 0;
  doc.mockImplementation(() => (docCalls++ === 0 ? { get: () => Promise.resolve({ exists: false }) } : { get, update }));
}

function request(headers: Record<string, string>, body?: unknown) {
  return new NextRequest("http://localhost/api/admin/events/e1", {
    method: "PATCH",
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

function context(id = "e1") {
  return { params: { id } };
}

beforeEach(() => {
  vi.clearAllMocks();
  getUser.mockResolvedValue({ disabled: false });
  resetChain();
  process.env.ADMIN_EMAILS = "staff@earlydays.example";
  verifyIdToken.mockResolvedValue({ email: "staff@earlydays.example" });
  get.mockResolvedValue({ exists: true, data: () => existingEvent });
  update.mockResolvedValue(undefined);
});

afterEach(() => {
  delete process.env.ADMIN_EMAILS;
  delete process.env.ADMIN_EMAILS_EVENTS;
});

describe("PATCH /api/admin/events/[id]", () => {
  it("rejects requests without an Authorization header", async () => {
    verifyIdToken.mockReset();
    const { PATCH } = await import("@/app/api/admin/events/[id]/route");
    const res = await PATCH(request({}, { title: "New title" }), context());
    expect(res.status).toBe(401);
  });

  it("403s when the token's email isn't authorized", async () => {
    verifyIdToken.mockResolvedValue({ email: "parent@example.com" });
    const { PATCH } = await import("@/app/api/admin/events/[id]/route");
    const res = await PATCH(request({ authorization: "Bearer ok" }, { title: "New title" }), context());
    expect(res.status).toBe(403);
    expect(update).not.toHaveBeenCalled();
  });

  it("404s when the event doesn't exist", async () => {
    get.mockResolvedValue({ exists: false });
    const { PATCH } = await import("@/app/api/admin/events/[id]/route");
    const res = await PATCH(request({ authorization: "Bearer ok" }, { title: "New title" }), context());
    expect(res.status).toBe(404);
  });

  it("400s when the updated title exceeds the max length", async () => {
    const { PATCH } = await import("@/app/api/admin/events/[id]/route");
    const res = await PATCH(request({ authorization: "Bearer ok" }, { title: "x".repeat(201) }), context());
    expect(res.status).toBe(400);
    expect(update).not.toHaveBeenCalled();
  });

  it("400s when the updated date isn't in YYYY-MM-DD format", async () => {
    const { PATCH } = await import("@/app/api/admin/events/[id]/route");
    const res = await PATCH(request({ authorization: "Bearer ok" }, { date: "11/01/2026" }), context());
    expect(res.status).toBe(400);
    expect(update).not.toHaveBeenCalled();
  });

  it("updates provided fields and returns the merged event", async () => {
    const { PATCH } = await import("@/app/api/admin/events/[id]/route");
    const res = await PATCH(
      request({ authorization: "Bearer ok" }, { title: "Updated title", date: "2026-12-01" }),
      context()
    );
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ title: "Updated title", date: "2026-12-01" }));
    expect(json).toMatchObject({ id: "e1", title: "Updated title", date: "2026-12-01", tag: existingEvent.tag });
  });
});
