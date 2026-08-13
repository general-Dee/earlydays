import { createHmac } from "crypto";
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const verifyIdToken = vi.fn();
const doc = vi.fn();
const collection = vi.fn();
const docGet = vi.fn();
const docSet = vi.fn();
const collectionAdd = vi.fn();

vi.mock("@/lib/firebase/admin", () => ({
  getAdminAuth: () => ({ verifyIdToken }),
  getAdminDb: () => ({ doc, collection }),
}));

doc.mockImplementation(() => ({ get: docGet, set: docSet }));
collection.mockImplementation(() => ({ add: collectionAdd }));

function makeRequest(url: string, init: ConstructorParameters<typeof NextRequest>[1] = {}) {
  return new NextRequest(`http://localhost${url}`, init);
}

function jsonRequest(url: string, body: unknown, headers: Record<string, string> = {}) {
  return makeRequest(url, {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  doc.mockImplementation(() => ({ get: docGet, set: docSet }));
  collection.mockImplementation(() => ({ add: collectionAdd }));
});

afterEach(() => {
  vi.unstubAllGlobals();
  delete process.env.PAYSTACK_SECRET_KEY;
});

describe("POST /api/paystack/initialize", () => {
  it("rejects requests without an Authorization header", async () => {
    const { POST } = await import("@/app/api/paystack/initialize/route");
    const res = await POST(jsonRequest("/api/paystack/initialize", {}));
    expect(res.status).toBe(401);
  });

  it("rejects an invalid token", async () => {
    verifyIdToken.mockRejectedValue(new Error("bad token"));
    const { POST } = await import("@/app/api/paystack/initialize/route");
    const res = await POST(
      jsonRequest("/api/paystack/initialize", {}, { authorization: "Bearer bad" })
    );
    expect(res.status).toBe(401);
  });

  it("requires childId and term", async () => {
    verifyIdToken.mockResolvedValue({ uid: "u1" });
    const { POST } = await import("@/app/api/paystack/initialize/route");
    const res = await POST(
      jsonRequest("/api/paystack/initialize", {}, { authorization: "Bearer ok" })
    );
    expect(res.status).toBe(400);
  });

  it("404s when there is no parent record", async () => {
    verifyIdToken.mockResolvedValue({ uid: "u1" });
    docGet.mockResolvedValue({ exists: false });
    const { POST } = await import("@/app/api/paystack/initialize/route");
    const res = await POST(
      jsonRequest(
        "/api/paystack/initialize",
        { childId: "c1", term: "Term 1" },
        { authorization: "Bearer ok" }
      )
    );
    expect(res.status).toBe(404);
  });

  it("403s when the child isn't linked to the account", async () => {
    verifyIdToken.mockResolvedValue({ uid: "u1" });
    docGet.mockResolvedValue({
      exists: true,
      data: () => ({ email: "p@example.com", children: [{ id: "other", stage: "N1" }] }),
    });
    const { POST } = await import("@/app/api/paystack/initialize/route");
    const res = await POST(
      jsonRequest(
        "/api/paystack/initialize",
        { childId: "c1", term: "Term 1" },
        { authorization: "Bearer ok" }
      )
    );
    expect(res.status).toBe(403);
  });

  it("500s when the child's stage has no configured fee", async () => {
    verifyIdToken.mockResolvedValue({ uid: "u1" });
    docGet.mockResolvedValue({
      exists: true,
      data: () => ({ email: "p@example.com", children: [{ id: "c1", stage: "ZZ", name: "Kid" }] }),
    });
    const { POST } = await import("@/app/api/paystack/initialize/route");
    const res = await POST(
      jsonRequest(
        "/api/paystack/initialize",
        { childId: "c1", term: "Term 1" },
        { authorization: "Bearer ok" }
      )
    );
    expect(res.status).toBe(500);
  });

  it("500s when Paystack isn't configured", async () => {
    verifyIdToken.mockResolvedValue({ uid: "u1" });
    docGet.mockResolvedValue({
      exists: true,
      data: () => ({ email: "p@example.com", children: [{ id: "c1", stage: "N1", name: "Kid" }] }),
    });
    const { POST } = await import("@/app/api/paystack/initialize/route");
    const res = await POST(
      jsonRequest(
        "/api/paystack/initialize",
        { childId: "c1", term: "Term 1" },
        { authorization: "Bearer ok" }
      )
    );
    expect(res.status).toBe(500);
  });

  it("starts a payment and records it as pending", async () => {
    process.env.PAYSTACK_SECRET_KEY = "sk_test";
    verifyIdToken.mockResolvedValue({ uid: "u1" });
    docGet.mockResolvedValue({
      exists: true,
      data: () => ({ email: "p@example.com", children: [{ id: "c1", stage: "N1", name: "Kid" }] }),
    });
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ status: true, data: { access_code: "AC_123" } }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const { POST } = await import("@/app/api/paystack/initialize/route");
    const res = await POST(
      jsonRequest(
        "/api/paystack/initialize",
        { childId: "c1", term: "Term 1" },
        { authorization: "Bearer ok" }
      )
    );
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.accessCode).toBe("AC_123");
    expect(json.reference).toMatch(/^edy_/);
    expect(collectionAdd).not.toHaveBeenCalled();
    expect(docSet).toHaveBeenCalledWith(
      expect.objectContaining({ status: "pending", childId: "c1" })
    );
  });
});

describe("POST /api/paystack/verify", () => {
  it("rejects requests without an Authorization header", async () => {
    const { POST } = await import("@/app/api/paystack/verify/route");
    const res = await POST(jsonRequest("/api/paystack/verify", {}));
    expect(res.status).toBe(401);
  });

  it("404s when the payment record doesn't exist", async () => {
    verifyIdToken.mockResolvedValue({ uid: "u1" });
    docGet.mockResolvedValue({ exists: false });
    const { POST } = await import("@/app/api/paystack/verify/route");
    const res = await POST(
      jsonRequest("/api/paystack/verify", { reference: "edy_1" }, { authorization: "Bearer ok" })
    );
    expect(res.status).toBe(404);
  });

  it("marks the payment failed when Paystack doesn't confirm success", async () => {
    process.env.PAYSTACK_SECRET_KEY = "sk_test";
    verifyIdToken.mockResolvedValue({ uid: "u1" });
    docGet.mockResolvedValue({ exists: true, data: () => ({ amountKobo: 6_000_000 }) });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ status: true, data: { status: "failed", amount: 6_000_000 } }),
      })
    );

    const { POST } = await import("@/app/api/paystack/verify/route");
    const res = await POST(
      jsonRequest("/api/paystack/verify", { reference: "edy_1" }, { authorization: "Bearer ok" })
    );
    const json = await res.json();

    expect(json.status).toBe("failed");
    expect(docSet).toHaveBeenCalledWith({ status: "failed" }, { merge: true });
  });

  it("marks the payment successful when the amount matches", async () => {
    process.env.PAYSTACK_SECRET_KEY = "sk_test";
    verifyIdToken.mockResolvedValue({ uid: "u1" });
    docGet.mockResolvedValue({ exists: true, data: () => ({ amountKobo: 6_000_000 }) });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          status: true,
          data: { status: "success", amount: 6_000_000, channel: "card" },
        }),
      })
    );

    const { POST } = await import("@/app/api/paystack/verify/route");
    const res = await POST(
      jsonRequest("/api/paystack/verify", { reference: "edy_1" }, { authorization: "Bearer ok" })
    );
    const json = await res.json();

    expect(json.status).toBe("success");
    expect(docSet).toHaveBeenCalledWith(
      expect.objectContaining({ status: "success", channel: "card" }),
      { merge: true }
    );
  });
});

describe("POST /api/paystack/webhook", () => {
  function signedRequest(secret: string, payload: object) {
    const rawBody = JSON.stringify(payload);
    const signature = createHmac("sha512", secret).update(rawBody).digest("hex");
    return new NextRequest("http://localhost/api/paystack/webhook", {
      method: "POST",
      headers: { "x-paystack-signature": signature },
      body: rawBody,
    });
  }

  it("rejects an invalid signature", async () => {
    process.env.PAYSTACK_SECRET_KEY = "sk_test";
    const { POST } = await import("@/app/api/paystack/webhook/route");
    const req = new NextRequest("http://localhost/api/paystack/webhook", {
      method: "POST",
      headers: { "x-paystack-signature": "deadbeef" },
      body: JSON.stringify({ event: "charge.success", data: {} }),
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("records a successful charge from a validly signed event", async () => {
    process.env.PAYSTACK_SECRET_KEY = "sk_test";
    const { POST } = await import("@/app/api/paystack/webhook/route");
    const req = signedRequest("sk_test", {
      event: "charge.success",
      data: { reference: "edy_1", amount: 6_000_000, channel: "card", metadata: { uid: "u1" } },
    });
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.received).toBe(true);
    expect(docSet).toHaveBeenCalledWith(
      expect.objectContaining({ status: "success", channel: "card", amountKobo: 6_000_000 }),
      { merge: true }
    );
  });
});
