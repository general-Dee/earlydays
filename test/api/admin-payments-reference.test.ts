import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const verifyIdToken = vi.fn();
const doc = vi.fn();
const paymentGet = vi.fn();
const parentGet = vi.fn();
const collection = vi.fn(() => ({ doc: () => ({ get: () => Promise.resolve({ exists: false }) }) }));

vi.mock("@/lib/firebase/admin", () => ({
  getAdminAuth: () => ({ verifyIdToken }),
  getAdminDb: () => ({ doc, collection }),
}));

function request(url: string, headers: Record<string, string> = {}) {
  return new NextRequest(url, { headers });
}

function context(reference = "edy_1") {
  return { params: { reference } };
}

beforeEach(() => {
  vi.clearAllMocks();
  doc.mockImplementation((path: string) => {
    if (path === "parents/u1") return { get: parentGet };
    return { get: paymentGet };
  });
  paymentGet.mockResolvedValue({ exists: true, data: () => fakePayment });
  parentGet.mockResolvedValue({ exists: true, data: () => fakeParent });
  process.env.ADMIN_EMAILS = "staff@earlydays.example";
  verifyIdToken.mockResolvedValue({ email: "staff@earlydays.example" });
});

afterEach(() => {
  delete process.env.ADMIN_EMAILS;
  delete process.env.ADMIN_EMAILS_PAYMENTS;
});

const fakePayment = {
  reference: "edy_1",
  childId: "c1",
  childName: "Zainab",
  term: "Term 1",
  amountKobo: 60_000_00,
  status: "success",
  createdAt: 1,
  paidAt: 2,
  channel: "card",
};

const fakeParent = { guardianName: "Aisha", email: "aisha@example.com", children: [] };

describe("GET /api/admin/payments/[reference]", () => {
  it("rejects requests without an Authorization header", async () => {
    verifyIdToken.mockReset();
    const { GET } = await import("@/app/api/admin/payments/[reference]/route");
    const res = await GET(request("http://localhost/api/admin/payments/edy_1?uid=u1"), context());
    expect(res.status).toBe(401);
  });

  it("403s when the token's email isn't authorized", async () => {
    verifyIdToken.mockResolvedValue({ email: "parent@example.com" });
    const { GET } = await import("@/app/api/admin/payments/[reference]/route");
    const res = await GET(
      request("http://localhost/api/admin/payments/edy_1?uid=u1", { authorization: "Bearer ok" }),
      context()
    );
    expect(res.status).toBe(403);
    expect(paymentGet).not.toHaveBeenCalled();
  });

  it("400s when uid is missing", async () => {
    const { GET } = await import("@/app/api/admin/payments/[reference]/route");
    const res = await GET(
      request("http://localhost/api/admin/payments/edy_1", { authorization: "Bearer ok" }),
      context()
    );
    expect(res.status).toBe(400);
  });

  it("404s when the payment doc doesn't exist", async () => {
    paymentGet.mockResolvedValue({ exists: false });
    const { GET } = await import("@/app/api/admin/payments/[reference]/route");
    const res = await GET(
      request("http://localhost/api/admin/payments/edy_missing?uid=u1", { authorization: "Bearer ok" }),
      context("edy_missing")
    );
    expect(res.status).toBe(404);
  });

  it("returns the payment and guardian info for a successful payment", async () => {
    const { GET } = await import("@/app/api/admin/payments/[reference]/route");
    const res = await GET(
      request("http://localhost/api/admin/payments/edy_1?uid=u1", { authorization: "Bearer ok" }),
      context()
    );
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toEqual({
      payment: fakePayment,
      guardianName: "Aisha",
      guardianEmail: "aisha@example.com",
    });
  });

  it("returns a non-success payment too, without filtering it out", async () => {
    paymentGet.mockResolvedValue({ exists: true, data: () => ({ ...fakePayment, status: "pending" }) });
    const { GET } = await import("@/app/api/admin/payments/[reference]/route");
    const res = await GET(
      request("http://localhost/api/admin/payments/edy_1?uid=u1", { authorization: "Bearer ok" }),
      context()
    );
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.payment.status).toBe("pending");
  });
});
