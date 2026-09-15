import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const verifyIdToken = vi.fn();
const getUser = vi.fn();
const doc = vi.fn();
const paymentGet = vi.fn();
const paymentSet = vi.fn();
const parentGet = vi.fn();
const collection = vi.fn(() => ({ doc: () => ({ get: () => Promise.resolve({ exists: false }) }) }));

vi.mock("@/lib/firebase/admin", () => ({
  getAdminAuth: () => ({ verifyIdToken, getUser }),
  getAdminDb: () => ({ doc, collection }),
}));

const logAdminAction = vi.fn();
vi.mock("@/lib/audit", () => ({
  logAdminAction: (...args: unknown[]) => logAdminAction(...args),
}));

const sendPaymentReceiptEmail = vi.fn();
vi.mock("@/lib/email/notify", () => ({
  sendPaymentReceiptEmail: (...args: unknown[]) => sendPaymentReceiptEmail(...args),
}));

function request(url: string, headers: Record<string, string> = {}) {
  return new NextRequest(url, { headers });
}

function postRequest(url: string, body: unknown, headers: Record<string, string> = {}) {
  return new NextRequest(url, {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}

function context(reference = "edy_1") {
  return { params: { reference } };
}

beforeEach(() => {
  vi.clearAllMocks();
  getUser.mockResolvedValue({ disabled: false });
  doc.mockImplementation((path: string) => {
    if (path === "parents/u1") return { get: parentGet };
    return { get: paymentGet, set: paymentSet };
  });
  paymentGet.mockResolvedValue({ exists: true, data: () => fakePayment });
  paymentSet.mockResolvedValue(undefined);
  parentGet.mockResolvedValue({ exists: true, data: () => fakeParent });
  sendPaymentReceiptEmail.mockResolvedValue(true);
  process.env.ADMIN_EMAILS = "staff@earlydays.example";
  verifyIdToken.mockResolvedValue({ email: "staff@earlydays.example" });
});

afterEach(() => {
  delete process.env.ADMIN_EMAILS;
  delete process.env.ADMIN_EMAILS_PAYMENTS;
  delete process.env.PAYSTACK_SECRET_KEY;
  vi.unstubAllGlobals();
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

describe("POST /api/admin/payments/[reference]", () => {
  const pendingPayment = { ...fakePayment, status: "pending" as const };

  it("rejects requests without an Authorization header", async () => {
    verifyIdToken.mockReset();
    const { POST } = await import("@/app/api/admin/payments/[reference]/route");
    const res = await POST(postRequest("http://localhost/api/admin/payments/edy_1", { uid: "u1" }), context());
    expect(res.status).toBe(401);
  });

  it("403s when the token's email isn't authorized", async () => {
    verifyIdToken.mockResolvedValue({ email: "parent@example.com" });
    const { POST } = await import("@/app/api/admin/payments/[reference]/route");
    const res = await POST(
      postRequest("http://localhost/api/admin/payments/edy_1", { uid: "u1" }, { authorization: "Bearer ok" }),
      context()
    );
    expect(res.status).toBe(403);
    expect(paymentSet).not.toHaveBeenCalled();
  });

  it("400s when uid is missing", async () => {
    const { POST } = await import("@/app/api/admin/payments/[reference]/route");
    const res = await POST(
      postRequest("http://localhost/api/admin/payments/edy_1", {}, { authorization: "Bearer ok" }),
      context()
    );
    expect(res.status).toBe(400);
  });

  it("404s when the payment doc doesn't exist", async () => {
    paymentGet.mockResolvedValue({ exists: false });
    const { POST } = await import("@/app/api/admin/payments/[reference]/route");
    const res = await POST(
      postRequest("http://localhost/api/admin/payments/edy_1", { uid: "u1" }, { authorization: "Bearer ok" }),
      context()
    );
    expect(res.status).toBe(404);
  });

  it("400s when the payment isn't pending", async () => {
    paymentGet.mockResolvedValue({ exists: true, data: () => fakePayment }); // status: "success"
    const { POST } = await import("@/app/api/admin/payments/[reference]/route");
    const res = await POST(
      postRequest("http://localhost/api/admin/payments/edy_1", { uid: "u1" }, { authorization: "Bearer ok" }),
      context()
    );
    expect(res.status).toBe(400);
    expect(paymentSet).not.toHaveBeenCalled();
  });

  it("500s when Paystack isn't configured", async () => {
    paymentGet.mockResolvedValue({ exists: true, data: () => pendingPayment });
    const { POST } = await import("@/app/api/admin/payments/[reference]/route");
    const res = await POST(
      postRequest("http://localhost/api/admin/payments/edy_1", { uid: "u1" }, { authorization: "Bearer ok" }),
      context()
    );
    expect(res.status).toBe(500);
    expect(paymentSet).not.toHaveBeenCalled();
  });

  it("502s when the Paystack request itself fails (network error)", async () => {
    process.env.PAYSTACK_SECRET_KEY = "sk_test";
    paymentGet.mockResolvedValue({ exists: true, data: () => pendingPayment });
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));

    const { POST } = await import("@/app/api/admin/payments/[reference]/route");
    const res = await POST(
      postRequest("http://localhost/api/admin/payments/edy_1", { uid: "u1" }, { authorization: "Bearer ok" }),
      context()
    );

    expect(res.status).toBe(502);
    expect(paymentSet).not.toHaveBeenCalled();
  });

  it("marks the payment failed, logs it, and sends no email when Paystack doesn't confirm success", async () => {
    process.env.PAYSTACK_SECRET_KEY = "sk_test";
    paymentGet.mockResolvedValue({ exists: true, data: () => pendingPayment });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ status: true, data: { status: "failed", amount: pendingPayment.amountKobo } }),
      })
    );

    const { POST } = await import("@/app/api/admin/payments/[reference]/route");
    const res = await POST(
      postRequest("http://localhost/api/admin/payments/edy_1", { uid: "u1" }, { authorization: "Bearer ok" }),
      context()
    );
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.status).toBe("failed");
    expect(paymentSet).toHaveBeenCalledWith({ status: "failed" }, { merge: true });
    expect(logAdminAction).toHaveBeenCalledWith(
      expect.objectContaining({ action: "payment.reconciled", actorEmail: "staff@earlydays.example", targetUid: "u1" })
    );
    expect(sendPaymentReceiptEmail).not.toHaveBeenCalled();
  });

  it("marks the payment successful, logs it, and emails a receipt when the amount matches", async () => {
    process.env.PAYSTACK_SECRET_KEY = "sk_test";
    paymentGet.mockResolvedValue({ exists: true, data: () => pendingPayment });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          status: true,
          data: { status: "success", amount: pendingPayment.amountKobo, channel: "card" },
        }),
      })
    );

    const { POST } = await import("@/app/api/admin/payments/[reference]/route");
    const res = await POST(
      postRequest("http://localhost/api/admin/payments/edy_1", { uid: "u1" }, { authorization: "Bearer ok" }),
      context()
    );
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toEqual({ status: "success", emailSent: true });
    expect(paymentSet).toHaveBeenCalledWith(
      expect.objectContaining({ status: "success", channel: "card" }),
      { merge: true }
    );
    expect(sendPaymentReceiptEmail).toHaveBeenCalledWith(
      { guardianName: "Aisha", email: "aisha@example.com" },
      { childName: "Zainab", term: "Term 1", amountKobo: pendingPayment.amountKobo, reference: "edy_1" }
    );
  });

  it("still succeeds if sending the receipt email fails", async () => {
    process.env.PAYSTACK_SECRET_KEY = "sk_test";
    paymentGet.mockResolvedValue({ exists: true, data: () => pendingPayment });
    sendPaymentReceiptEmail.mockRejectedValue(new Error("resend down"));
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          status: true,
          data: { status: "success", amount: pendingPayment.amountKobo, channel: "card" },
        }),
      })
    );

    const { POST } = await import("@/app/api/admin/payments/[reference]/route");
    const res = await POST(
      postRequest("http://localhost/api/admin/payments/edy_1", { uid: "u1" }, { authorization: "Bearer ok" }),
      context()
    );
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toEqual({ status: "success", emailSent: false });
  });
});
