import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const verifyIdToken = vi.fn();
const collection = vi.fn();
const doc = vi.fn();
const update = vi.fn();

vi.mock("@/lib/firebase/admin", () => ({
  getAdminAuth: () => ({ verifyIdToken }),
  getAdminDb: () => ({ collection }),
}));

collection.mockImplementation(() => ({ doc }));
doc.mockImplementation(() => ({ update }));

function request(headers: Record<string, string> = {}, body?: unknown) {
  return new NextRequest("http://localhost/api/admin/inquiries/i1", {
    method: "PATCH",
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

function context(id = "i1") {
  return { params: { id } };
}

beforeEach(() => {
  vi.clearAllMocks();
  collection.mockImplementation(() => ({ doc }));
  doc.mockImplementation(() => ({ update }));
  update.mockResolvedValue(undefined);
});

afterEach(() => {
  delete process.env.ADMIN_EMAILS;
});

describe("PATCH /api/admin/inquiries/[id]", () => {
  it("rejects requests without an Authorization header", async () => {
    const { PATCH } = await import("@/app/api/admin/inquiries/[id]/route");
    const res = await PATCH(request({}, { status: "contacted" }), context());
    expect(res.status).toBe(401);
  });

  it("rejects an invalid token", async () => {
    verifyIdToken.mockRejectedValue(new Error("bad token"));
    const { PATCH } = await import("@/app/api/admin/inquiries/[id]/route");
    const res = await PATCH(request({ authorization: "Bearer bad" }, { status: "contacted" }), context());
    expect(res.status).toBe(401);
  });

  it("403s when the token's email isn't in ADMIN_EMAILS", async () => {
    process.env.ADMIN_EMAILS = "staff@earlydays.example";
    verifyIdToken.mockResolvedValue({ email: "parent@example.com" });
    const { PATCH } = await import("@/app/api/admin/inquiries/[id]/route");
    const res = await PATCH(
      request({ authorization: "Bearer ok" }, { status: "contacted" }),
      context()
    );
    expect(res.status).toBe(403);
    expect(update).not.toHaveBeenCalled();
  });

  it("400s on a missing status", async () => {
    process.env.ADMIN_EMAILS = "staff@earlydays.example";
    verifyIdToken.mockResolvedValue({ email: "staff@earlydays.example" });
    const { PATCH } = await import("@/app/api/admin/inquiries/[id]/route");
    const res = await PATCH(request({ authorization: "Bearer ok" }, {}), context());
    expect(res.status).toBe(400);
    expect(update).not.toHaveBeenCalled();
  });

  it("400s on an invalid status", async () => {
    process.env.ADMIN_EMAILS = "staff@earlydays.example";
    verifyIdToken.mockResolvedValue({ email: "staff@earlydays.example" });
    const { PATCH } = await import("@/app/api/admin/inquiries/[id]/route");
    const res = await PATCH(
      request({ authorization: "Bearer ok" }, { status: "archived" }),
      context()
    );
    expect(res.status).toBe(400);
    expect(update).not.toHaveBeenCalled();
  });

  it("updates the inquiry's status for an allow-listed admin email", async () => {
    process.env.ADMIN_EMAILS = "Staff@Earlydays.example";
    verifyIdToken.mockResolvedValue({ email: "staff@earlydays.example" });
    const { PATCH } = await import("@/app/api/admin/inquiries/[id]/route");
    const res = await PATCH(
      request({ authorization: "Bearer ok" }, { status: "resolved" }),
      context("i1")
    );
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toEqual({ ok: true });
    expect(collection).toHaveBeenCalledWith("inquiries");
    expect(doc).toHaveBeenCalledWith("i1");
    expect(update).toHaveBeenCalledWith({ status: "resolved" });
  });
});
