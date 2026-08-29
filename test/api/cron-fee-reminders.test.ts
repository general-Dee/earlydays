import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const CURRENT_TERM = "Term 2";

const collection = vi.fn();
const parentsGet = vi.fn();
const paymentsGet = vi.fn();

vi.mock("@/lib/firebase/admin", () => ({
  getAdminDb: () => ({ collection }),
}));

const getCurrentTerm = vi.fn();
vi.mock("@/lib/termSettings", () => ({
  getCurrentTerm: () => getCurrentTerm(),
}));

const FEES_BY_STAGE = { N1: 60_000_00, P1: 75_000_00 };
const getFeeAmounts = vi.fn();
vi.mock("@/lib/feeSettings", () => ({
  getFeeAmounts: () => getFeeAmounts(),
  feeKoboByStageCode: (amounts: Record<string, number>) => amounts,
}));

const sendFeeReminderEmail = vi.fn();
vi.mock("@/lib/email/notify", () => ({
  sendFeeReminderEmail: (...args: unknown[]) => sendFeeReminderEmail(...args),
}));

const sendWhatsAppFeeReminder = vi.fn();
vi.mock("@/lib/whatsapp", () => ({
  sendWhatsAppFeeReminder: (...args: unknown[]) => sendWhatsAppFeeReminder(...args),
}));

const sendSmsFeeReminder = vi.fn();
vi.mock("@/lib/sms", () => ({
  sendSmsFeeReminder: (...args: unknown[]) => sendSmsFeeReminder(...args),
}));

function request(headers: Record<string, string> = {}) {
  return new NextRequest("http://localhost/api/cron/fee-reminders", { headers });
}

function parentDoc(id: string, data: unknown) {
  return { id, data: () => data };
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.CRON_SECRET = "test-secret";
  collection.mockImplementation((path: string) =>
    path === "parents" ? { get: parentsGet } : { get: paymentsGet }
  );
  sendFeeReminderEmail.mockResolvedValue(true);
  sendWhatsAppFeeReminder.mockResolvedValue(true);
  sendSmsFeeReminder.mockResolvedValue(true);
  getCurrentTerm.mockResolvedValue(CURRENT_TERM);
  getFeeAmounts.mockResolvedValue(FEES_BY_STAGE);
});

afterEach(() => {
  delete process.env.CRON_SECRET;
});

describe("GET /api/cron/fee-reminders", () => {
  it("401s without the correct CRON_SECRET", async () => {
    const { GET } = await import("@/app/api/cron/fee-reminders/route");
    const res = await GET(request({ authorization: "Bearer wrong" }));
    expect(res.status).toBe(401);
  });

  it("401s when CRON_SECRET isn't configured", async () => {
    delete process.env.CRON_SECRET;
    const { GET } = await import("@/app/api/cron/fee-reminders/route");
    const res = await GET(request({ authorization: "Bearer test-secret" }));
    expect(res.status).toBe(401);
  });

  it("emails a reminder for a parent with an unpaid child", async () => {
    parentsGet.mockResolvedValue({
      docs: [
        parentDoc("u1", {
          guardianName: "Aisha",
          email: "a@b.com",
          children: [{ id: "c1", name: "Kid", stage: "N1" }],
        }),
      ],
    });
    paymentsGet.mockResolvedValue({ docs: [] });

    const { GET } = await import("@/app/api/cron/fee-reminders/route");
    const res = await GET(request({ authorization: "Bearer test-secret" }));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toEqual({ ok: true, emailsSent: 1, whatsappSent: 0, smsSent: 0 });
    expect(sendFeeReminderEmail).toHaveBeenCalledWith(
      { guardianName: "Aisha", email: "a@b.com" },
      [{ name: "Kid", stage: "N1" }],
      CURRENT_TERM,
      FEES_BY_STAGE
    );
    expect(sendWhatsAppFeeReminder).not.toHaveBeenCalled();
    expect(sendSmsFeeReminder).not.toHaveBeenCalled();
  });

  it("skips a parent whose child already paid for the current term", async () => {
    parentsGet.mockResolvedValue({
      docs: [
        parentDoc("u1", {
          guardianName: "Aisha",
          email: "a@b.com",
          children: [{ id: "c1", name: "Kid", stage: "N1" }],
        }),
      ],
    });
    paymentsGet.mockResolvedValue({
      docs: [{ data: () => ({ childId: "c1", term: CURRENT_TERM, status: "success" }) }],
    });

    const { GET } = await import("@/app/api/cron/fee-reminders/route");
    const res = await GET(request({ authorization: "Bearer test-secret" }));
    const json = await res.json();

    expect(json).toEqual({ ok: true, emailsSent: 0, whatsappSent: 0, smsSent: 0 });
    expect(sendFeeReminderEmail).not.toHaveBeenCalled();
  });

  it("lists every unpaid child for a parent in a single email", async () => {
    parentsGet.mockResolvedValue({
      docs: [
        parentDoc("u1", {
          guardianName: "Aisha",
          email: "a@b.com",
          children: [
            { id: "c1", name: "Kid One", stage: "N1" },
            { id: "c2", name: "Kid Two", stage: "P1" },
          ],
        }),
      ],
    });
    paymentsGet.mockResolvedValue({ docs: [] });

    const { GET } = await import("@/app/api/cron/fee-reminders/route");
    await GET(request({ authorization: "Bearer test-secret" }));

    expect(sendFeeReminderEmail).toHaveBeenCalledTimes(1);
    expect(sendFeeReminderEmail).toHaveBeenCalledWith(
      { guardianName: "Aisha", email: "a@b.com" },
      [
        { name: "Kid One", stage: "N1" },
        { name: "Kid Two", stage: "P1" },
      ],
      CURRENT_TERM,
      FEES_BY_STAGE
    );
  });

  it("attempts WhatsApp and SMS when the parent has a phone number", async () => {
    parentsGet.mockResolvedValue({
      docs: [
        parentDoc("u1", {
          guardianName: "Aisha",
          email: "a@b.com",
          phone: "08012345678",
          children: [{ id: "c1", name: "Kid", stage: "N1" }],
        }),
      ],
    });
    paymentsGet.mockResolvedValue({ docs: [] });

    const { GET } = await import("@/app/api/cron/fee-reminders/route");
    const res = await GET(request({ authorization: "Bearer test-secret" }));
    const json = await res.json();

    expect(json).toEqual({ ok: true, emailsSent: 1, whatsappSent: 1, smsSent: 1 });
    expect(sendWhatsAppFeeReminder).toHaveBeenCalledWith(
      { guardianName: "Aisha", phone: "08012345678" },
      [{ name: "Kid", stage: "N1" }],
      CURRENT_TERM,
      FEES_BY_STAGE
    );
    expect(sendSmsFeeReminder).toHaveBeenCalledWith(
      { guardianName: "Aisha", phone: "08012345678" },
      [{ name: "Kid", stage: "N1" }],
      CURRENT_TERM,
      FEES_BY_STAGE
    );
  });

  it("doesn't attempt WhatsApp or SMS when the parent has no phone number on file", async () => {
    parentsGet.mockResolvedValue({
      docs: [
        parentDoc("u1", {
          guardianName: "Aisha",
          email: "a@b.com",
          children: [{ id: "c1", name: "Kid", stage: "N1" }],
        }),
      ],
    });
    paymentsGet.mockResolvedValue({ docs: [] });

    const { GET } = await import("@/app/api/cron/fee-reminders/route");
    await GET(request({ authorization: "Bearer test-secret" }));

    expect(sendWhatsAppFeeReminder).not.toHaveBeenCalled();
    expect(sendSmsFeeReminder).not.toHaveBeenCalled();
  });

  it("keeps counting other channels when one channel fails", async () => {
    sendWhatsAppFeeReminder.mockRejectedValue(new Error("graph api down"));
    parentsGet.mockResolvedValue({
      docs: [
        parentDoc("u1", {
          guardianName: "Aisha",
          email: "a@b.com",
          phone: "08012345678",
          children: [{ id: "c1", name: "Kid", stage: "N1" }],
        }),
      ],
    });
    paymentsGet.mockResolvedValue({ docs: [] });

    const { GET } = await import("@/app/api/cron/fee-reminders/route");
    const res = await GET(request({ authorization: "Bearer test-secret" }));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toEqual({ ok: true, emailsSent: 1, whatsappSent: 0, smsSent: 1 });
  });
});
