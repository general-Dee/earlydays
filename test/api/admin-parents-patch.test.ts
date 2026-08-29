import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const verifyIdToken = vi.fn();
const updateUser = vi.fn();
const revokeRefreshTokens = vi.fn();
const collection = vi.fn();
const doc = vi.fn();
const update = vi.fn();

vi.mock("@/lib/firebase/admin", () => ({
  getAdminAuth: () => ({ verifyIdToken, updateUser, revokeRefreshTokens }),
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
  updateUser.mockResolvedValue(undefined);
  revokeRefreshTokens.mockResolvedValue(undefined);
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

  it("updates the email via the Admin Auth SDK and keeps Firestore in sync", async () => {
    const { PATCH } = await import("@/app/api/admin/parents/[uid]/route");
    const res = await PATCH(
      request({ authorization: "Bearer ok" }, { email: "new@example.com" }),
      context()
    );
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(updateUser).toHaveBeenCalledWith("u1", { email: "new@example.com" });
    expect(update).toHaveBeenCalledWith({ email: "new@example.com" });
    expect(json).toEqual({ uid: "u1", email: "new@example.com" });
  });

  it("409s when the new email already belongs to another account, without touching Firestore", async () => {
    updateUser.mockRejectedValue(Object.assign(new Error("dup"), { code: "auth/email-already-exists" }));

    const { PATCH } = await import("@/app/api/admin/parents/[uid]/route");
    const res = await PATCH(
      request({ authorization: "Bearer ok" }, { email: "taken@example.com" }),
      context()
    );

    expect(res.status).toBe(409);
    expect(update).not.toHaveBeenCalled();
  });

  it("404s when the Auth user no longer exists", async () => {
    updateUser.mockRejectedValue(Object.assign(new Error("gone"), { code: "auth/user-not-found" }));

    const { PATCH } = await import("@/app/api/admin/parents/[uid]/route");
    const res = await PATCH(request({ authorization: "Bearer ok" }, { disabled: true }), context());

    expect(res.status).toBe(404);
    expect(update).not.toHaveBeenCalled();
  });

  it("400s when disabled isn't a boolean", async () => {
    const { PATCH } = await import("@/app/api/admin/parents/[uid]/route");
    const res = await PATCH(request({ authorization: "Bearer ok" }, { disabled: "yes" }), context());

    expect(res.status).toBe(400);
    expect(updateUser).not.toHaveBeenCalled();
  });

  it("deactivates an account and revokes its refresh tokens", async () => {
    const { PATCH } = await import("@/app/api/admin/parents/[uid]/route");
    const res = await PATCH(request({ authorization: "Bearer ok" }, { disabled: true }), context());
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(updateUser).toHaveBeenCalledWith("u1", { disabled: true });
    expect(revokeRefreshTokens).toHaveBeenCalledWith("u1");
    expect(update).not.toHaveBeenCalled();
    expect(json).toEqual({ uid: "u1", disabled: true });
  });

  it("reactivates an account without revoking tokens", async () => {
    const { PATCH } = await import("@/app/api/admin/parents/[uid]/route");
    const res = await PATCH(request({ authorization: "Bearer ok" }, { disabled: false }), context());
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(updateUser).toHaveBeenCalledWith("u1", { disabled: false });
    expect(revokeRefreshTokens).not.toHaveBeenCalled();
    expect(json).toEqual({ uid: "u1", disabled: false });
  });

  it("combines an email change and a deactivation into a single Auth update call", async () => {
    const { PATCH } = await import("@/app/api/admin/parents/[uid]/route");
    const res = await PATCH(
      request({ authorization: "Bearer ok" }, { email: "new@example.com", disabled: true }),
      context()
    );

    expect(res.status).toBe(200);
    expect(updateUser).toHaveBeenCalledTimes(1);
    expect(updateUser).toHaveBeenCalledWith("u1", { email: "new@example.com", disabled: true });
    expect(revokeRefreshTokens).toHaveBeenCalledWith("u1");
  });
});
