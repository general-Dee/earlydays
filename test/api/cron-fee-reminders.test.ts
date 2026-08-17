import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CURRENT_TERM } from "@/lib/fees";

const collection = vi.fn();
const parentsGet = vi.fn();
const paymentsGet = vi.fn();

vi.mock("@/lib/firebase/admin", () => ({
  getAdminDb: () => ({ collection }),
}));

const sendFeeReminderEmail = vi.fn();
vi.mock("@/lib/email/notify", () => ({
  sendFeeReminderEmail: (...args: unknown[]) => sendFeeReminderEmail(...args),
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
    expect(json).toEqual({ ok: true, remindersSent: 1 });
    expect(sendFeeReminderEmail).toHaveBeenCalledWith(
      { guardianName: "Aisha", email: "a@b.com" },
      [{ name: "Kid", stage: "N1" }],
      CURRENT_TERM
    );
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

    expect(json).toEqual({ ok: true, remindersSent: 0 });
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
      CURRENT_TERM
    );
  });
});
