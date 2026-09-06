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

const existingFaq = {
  id: "f1",
  question: "What ages do you take?",
  answer: "Creche through Primary 6.",
  order: 0,
  createdBy: "staff@earlydays.example",
  createdAt: 1,
};

function resetChain() {
  collection.mockImplementation(() => ({ doc }));
  docCalls = 0;
  doc.mockImplementation(() => (docCalls++ === 0 ? { get: () => Promise.resolve({ exists: false }) } : { get, update }));
}

function request(headers: Record<string, string>, body?: unknown) {
  return new NextRequest("http://localhost/api/admin/faqs/f1", {
    method: "PATCH",
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

function context(id = "f1") {
  return { params: { id } };
}

beforeEach(() => {
  vi.clearAllMocks();
  getUser.mockResolvedValue({ disabled: false });
  resetChain();
  process.env.ADMIN_EMAILS = "staff@earlydays.example";
  verifyIdToken.mockResolvedValue({ email: "staff@earlydays.example" });
  get.mockResolvedValue({ exists: true, data: () => existingFaq });
  update.mockResolvedValue(undefined);
});

afterEach(() => {
  delete process.env.ADMIN_EMAILS;
  delete process.env.ADMIN_EMAILS_FAQS;
});

describe("PATCH /api/admin/faqs/[id]", () => {
  it("rejects requests without an Authorization header", async () => {
    verifyIdToken.mockReset();
    const { PATCH } = await import("@/app/api/admin/faqs/[id]/route");
    const res = await PATCH(request({}, { question: "New question?" }), context());
    expect(res.status).toBe(401);
  });

  it("403s when the token's email isn't authorized", async () => {
    verifyIdToken.mockResolvedValue({ email: "parent@example.com" });
    const { PATCH } = await import("@/app/api/admin/faqs/[id]/route");
    const res = await PATCH(request({ authorization: "Bearer ok" }, { question: "New question?" }), context());
    expect(res.status).toBe(403);
    expect(update).not.toHaveBeenCalled();
  });

  it("404s when the FAQ doesn't exist", async () => {
    get.mockResolvedValue({ exists: false });
    const { PATCH } = await import("@/app/api/admin/faqs/[id]/route");
    const res = await PATCH(request({ authorization: "Bearer ok" }, { question: "New question?" }), context());
    expect(res.status).toBe(404);
  });

  it("400s on a non-integer order", async () => {
    const { PATCH } = await import("@/app/api/admin/faqs/[id]/route");
    const res = await PATCH(request({ authorization: "Bearer ok" }, { order: 1.5 }), context());
    expect(res.status).toBe(400);
    expect(update).not.toHaveBeenCalled();
  });

  it("400s when the updated question exceeds the max length", async () => {
    const { PATCH } = await import("@/app/api/admin/faqs/[id]/route");
    const res = await PATCH(request({ authorization: "Bearer ok" }, { question: "x".repeat(201) }), context());
    expect(res.status).toBe(400);
    expect(update).not.toHaveBeenCalled();
  });

  it("400s when the updated answer exceeds the max length", async () => {
    const { PATCH } = await import("@/app/api/admin/faqs/[id]/route");
    const res = await PATCH(request({ authorization: "Bearer ok" }, { answer: "x".repeat(2001) }), context());
    expect(res.status).toBe(400);
    expect(update).not.toHaveBeenCalled();
  });

  it("updates provided fields and returns the merged FAQ", async () => {
    const { PATCH } = await import("@/app/api/admin/faqs/[id]/route");
    const res = await PATCH(
      request({ authorization: "Bearer ok" }, { question: "Updated question?", order: 2 }),
      context()
    );
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ question: "Updated question?", order: 2 }));
    expect(json).toMatchObject({ id: "f1", question: "Updated question?", order: 2, answer: existingFaq.answer });
  });
});
