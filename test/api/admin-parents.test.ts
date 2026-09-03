import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const verifyIdToken = vi.fn();
const createUser = vi.fn();
const deleteUser = vi.fn();
const generatePasswordResetLink = vi.fn();
const getUsers = vi.fn();
const collection = vi.fn();
const orderBy = vi.fn();
const get = vi.fn();
const doc = vi.fn();
const set = vi.fn();
let docCalls = 0;

vi.mock("@/lib/firebase/admin", () => ({
  getAdminAuth: () => ({ verifyIdToken, createUser, deleteUser, generatePasswordResetLink, getUsers }),
  getAdminDb: () => ({ collection }),
}));

const sendParentInviteEmail = vi.fn();
vi.mock("@/lib/email/notify", () => ({
  sendParentInviteEmail: (...args: unknown[]) => sendParentInviteEmail(...args),
}));

collection.mockImplementation(() => ({ orderBy, doc }));
orderBy.mockImplementation(() => ({ get }));
doc.mockImplementation(() => (docCalls++ === 0 ? { get: () => Promise.resolve({ exists: false }) } : { set }));

function getRequest(headers: Record<string, string> = {}) {
  return new NextRequest("http://localhost/api/admin/parents", { headers });
}

function postRequest(headers: Record<string, string> = {}, body?: unknown) {
  return new NextRequest("http://localhost/api/admin/parents", {
    method: "POST",
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

const validBody = {
  guardianName: "Aisha Bello",
  email: "aisha@example.com",
  phone: "080000000",
  children: [{ name: "Zainab", stage: "N1", admissionNo: "A1" }],
};

beforeEach(() => {
  vi.clearAllMocks();
  collection.mockImplementation(() => ({ orderBy, doc }));
  orderBy.mockImplementation(() => ({ get }));
  docCalls = 0;
  doc.mockImplementation(() => (docCalls++ === 0 ? { get: () => Promise.resolve({ exists: false }) } : { set }));
  process.env.ADMIN_EMAILS = "staff@earlydays.example";
  verifyIdToken.mockResolvedValue({ email: "staff@earlydays.example" });
  deleteUser.mockResolvedValue(undefined);
  getUsers.mockResolvedValue({ users: [] });
});

afterEach(() => {
  delete process.env.ADMIN_EMAILS;
  delete process.env.ADMIN_EMAILS_PARENTS;
});

describe("GET /api/admin/parents", () => {
  it("rejects requests without an Authorization header", async () => {
    verifyIdToken.mockReset();
    const { GET } = await import("@/app/api/admin/parents/route");
    const res = await GET(getRequest());
    expect(res.status).toBe(401);
  });

  it("403s when the token's email isn't in ADMIN_EMAILS", async () => {
    verifyIdToken.mockResolvedValue({ email: "parent@example.com" });
    const { GET } = await import("@/app/api/admin/parents/route");
    const res = await GET(getRequest({ authorization: "Bearer ok" }));
    expect(res.status).toBe(403);
    expect(get).not.toHaveBeenCalled();
  });

  it("returns parents for an allow-listed admin email", async () => {
    get.mockResolvedValue({
      docs: [
        {
          id: "u1",
          data: () => ({
            uid: "u1",
            guardianName: "Aisha Bello",
            email: "aisha@example.com",
            children: [],
            createdAt: 2,
          }),
        },
      ],
    });

    const { GET } = await import("@/app/api/admin/parents/route");
    const res = await GET(getRequest({ authorization: "Bearer ok" }));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.parents).toEqual([
      {
        id: "u1",
        uid: "u1",
        guardianName: "Aisha Bello",
        email: "aisha@example.com",
        children: [],
        createdAt: 2,
        disabled: false,
      },
    ]);
    expect(collection).toHaveBeenCalledWith("parents");
    expect(orderBy).toHaveBeenCalledWith("createdAt", "desc");
    expect(getUsers).toHaveBeenCalledWith([{ uid: "u1" }]);
  });

  it("merges disabled status from the batched Auth lookup", async () => {
    get.mockResolvedValue({
      docs: [
        { id: "u1", data: () => ({ uid: "u1", guardianName: "Aisha", email: "a@b.com", children: [], createdAt: 1 }) },
        { id: "u2", data: () => ({ uid: "u2", guardianName: "Musa", email: "m@b.com", children: [], createdAt: 2 }) },
      ],
    });
    getUsers.mockResolvedValue({ users: [{ uid: "u1", disabled: true }, { uid: "u2", disabled: false }] });

    const { GET } = await import("@/app/api/admin/parents/route");
    const res = await GET(getRequest({ authorization: "Bearer ok" }));
    const json = await res.json();

    expect(json.parents.find((p: { uid: string }) => p.uid === "u1").disabled).toBe(true);
    expect(json.parents.find((p: { uid: string }) => p.uid === "u2").disabled).toBe(false);
  });

  it("skips the Auth batch lookup entirely when there are no parents", async () => {
    get.mockResolvedValue({ docs: [] });

    const { GET } = await import("@/app/api/admin/parents/route");
    const res = await GET(getRequest({ authorization: "Bearer ok" }));
    const json = await res.json();

    expect(json.parents).toEqual([]);
    expect(getUsers).not.toHaveBeenCalled();
  });
});

describe("POST /api/admin/parents", () => {
  it("rejects requests without an Authorization header", async () => {
    verifyIdToken.mockReset();
    const { POST } = await import("@/app/api/admin/parents/route");
    const res = await POST(postRequest({}, validBody));
    expect(res.status).toBe(401);
  });

  it("403s when the token's email isn't in ADMIN_EMAILS", async () => {
    verifyIdToken.mockResolvedValue({ email: "parent@example.com" });
    const { POST } = await import("@/app/api/admin/parents/route");
    const res = await POST(postRequest({ authorization: "Bearer ok" }, validBody));
    expect(res.status).toBe(403);
    expect(createUser).not.toHaveBeenCalled();
  });

  it("400s when guardian name or email is missing", async () => {
    const { POST } = await import("@/app/api/admin/parents/route");
    const res = await POST(postRequest({ authorization: "Bearer ok" }, { ...validBody, guardianName: "  " }));
    expect(res.status).toBe(400);
    expect(createUser).not.toHaveBeenCalled();
  });

  it("400s when there are no children", async () => {
    const { POST } = await import("@/app/api/admin/parents/route");
    const res = await POST(postRequest({ authorization: "Bearer ok" }, { ...validBody, children: [] }));
    expect(res.status).toBe(400);
    expect(createUser).not.toHaveBeenCalled();
  });

  it("400s on an unknown stage code", async () => {
    const { POST } = await import("@/app/api/admin/parents/route");
    const res = await POST(
      postRequest({ authorization: "Bearer ok" }, { ...validBody, children: [{ name: "Zainab", stage: "XX" }] })
    );
    expect(res.status).toBe(400);
    expect(createUser).not.toHaveBeenCalled();
  });

  it("creates a parent account, sends an invite, and returns the reset link", async () => {
    createUser.mockResolvedValue({ uid: "u1" });
    set.mockResolvedValue(undefined);
    generatePasswordResetLink.mockResolvedValue("https://earlydays.example/reset");
    sendParentInviteEmail.mockResolvedValue(true);

    const { POST } = await import("@/app/api/admin/parents/route");
    const res = await POST(postRequest({ authorization: "Bearer ok" }, validBody));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(createUser).toHaveBeenCalledWith(
      expect.objectContaining({ email: "aisha@example.com", password: expect.any(String) })
    );
    expect(collection).toHaveBeenCalledWith("parents");
    expect(doc).toHaveBeenCalledWith("u1");
    expect(set).toHaveBeenCalledWith(
      expect.objectContaining({
        uid: "u1",
        guardianName: "Aisha Bello",
        children: [expect.objectContaining({ id: expect.any(String), name: "Zainab", stage: "N1" })],
      })
    );
    expect(json).toMatchObject({ uid: "u1", resetLink: "https://earlydays.example/reset", emailSent: true });
  });

  it("409s when the email already has an account", async () => {
    createUser.mockRejectedValue(Object.assign(new Error("exists"), { code: "auth/email-already-exists" }));

    const { POST } = await import("@/app/api/admin/parents/route");
    const res = await POST(postRequest({ authorization: "Bearer ok" }, validBody));

    expect(res.status).toBe(409);
    expect(set).not.toHaveBeenCalled();
  });

  it("rolls back the Auth user when the Firestore write fails", async () => {
    createUser.mockResolvedValue({ uid: "u1" });
    set.mockRejectedValue(new Error("firestore down"));

    const { POST } = await import("@/app/api/admin/parents/route");
    const res = await POST(postRequest({ authorization: "Bearer ok" }, validBody));

    expect(res.status).toBe(500);
    expect(deleteUser).toHaveBeenCalledWith("u1");
  });
});
