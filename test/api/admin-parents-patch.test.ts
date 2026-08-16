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
  return new NextRequest("http://localhost/api/admin/parents/u1", {
    method: "PATCH",
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

function context(uid = "u1") {
  return { params: { uid } };
}

beforeEach(() => {
  vi.clearAllMocks();
  collection.mockImplementation(() => ({ doc }));
  doc.mockImplementation(() => ({ update }));
  update.mockResolvedValue(undefined);
  process.env.ADMIN_EMAILS = "staff@earlydays.example";
  verifyIdToken.mockResolvedValue({ email: "staff@earlydays.example" });
});

afterEach(() => {
  delete process.env.ADMIN_EMAILS;
  delete process.env.ADMIN_EMAILS_PARENTS;
});

describe("PATCH /api/admin/parents/[uid]", () => {
  it("rejects requests without an Authorization header", async () => {
    verifyIdToken.mockReset();
    const { PATCH } = await import("@/app/api/admin/parents/[uid]/route");
    const res = await PATCH(request({}, { phone: "080" }), context());
    expect(res.status).toBe(401);
  });

  it("403s when the token's email isn't in ADMIN_EMAILS", async () => {
    verifyIdToken.mockResolvedValue({ email: "parent@example.com" });
    const { PATCH } = await import("@/app/api/admin/parents/[uid]/route");
    const res = await PATCH(request({ authorization: "Bearer ok" }, { phone: "080" }), context());
    expect(res.status).toBe(403);
    expect(update).not.toHaveBeenCalled();
  });

  it("400s when the body has no updatable fields", async () => {
    const { PATCH } = await import("@/app/api/admin/parents/[uid]/route");
    const res = await PATCH(request({ authorization: "Bearer ok" }, {}), context());
    expect(res.status).toBe(400);
    expect(update).not.toHaveBeenCalled();
  });

  it("400s on an unknown stage code", async () => {
    const { PATCH } = await import("@/app/api/admin/parents/[uid]/route");
    const res = await PATCH(
      request({ authorization: "Bearer ok" }, { children: [{ name: "Zainab", stage: "XX" }] }),
      context()
    );
    expect(res.status).toBe(400);
    expect(update).not.toHaveBeenCalled();
  });

  it("updates only the phone number", async () => {
    const { PATCH } = await import("@/app/api/admin/parents/[uid]/route");
    const res = await PATCH(request({ authorization: "Bearer ok" }, { phone: "0801234567" }), context());
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(collection).toHaveBeenCalledWith("parents");
    expect(doc).toHaveBeenCalledWith("u1");
    expect(update).toHaveBeenCalledWith({ phone: "0801234567" });
    expect(json).toEqual({ uid: "u1", phone: "0801234567" });
  });

  it("replaces children, preserving an existing id and assigning a new one", async () => {
    const { PATCH } = await import("@/app/api/admin/parents/[uid]/route");
    const res = await PATCH(
      request(
        { authorization: "Bearer ok" },
        {
          children: [
            { id: "existing-1", name: "Zainab", stage: "N1" },
            { name: "Musa", stage: "P1" },
          ],
        }
      ),
      context()
    );
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(update).toHaveBeenCalledWith({
      children: [
        { id: "existing-1", name: "Zainab", stage: "N1" },
        expect.objectContaining({ id: expect.any(String), name: "Musa", stage: "P1" }),
      ],
    });
    expect(json.children[0].id).toBe("existing-1");
    expect(json.children[1].id).not.toBe("existing-1");
  });
});
