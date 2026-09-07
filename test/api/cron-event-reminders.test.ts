import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const collection = vi.fn();
const where = vi.fn();
const eventsGet = vi.fn();
const rsvpsGet = vi.fn();

vi.mock("@/lib/firebase/admin", () => ({
  getAdminDb: () => ({ collection }),
}));

const sendEventReminderEmail = vi.fn();
vi.mock("@/lib/email/notify", () => ({
  sendEventReminderEmail: (...args: unknown[]) => sendEventReminderEmail(...args),
}));

function collectionImpl(path: string) {
  return path === "events" ? { where } : { get: rsvpsGet };
}

function request(headers: Record<string, string> = {}) {
  return new NextRequest("http://localhost/api/cron/event-reminders", { headers });
}

const tomorrowEvent = { title: "Sports Day", date: "2026-09-08", tag: "All Stages", desc: "Bring a water bottle.", createdBy: "staff@earlydays.example", createdAt: 1 };

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-09-07T10:00:00.000Z"));
  process.env.CRON_SECRET = "test-secret";
  collection.mockImplementation(collectionImpl);
  where.mockImplementation(() => ({ get: eventsGet }));
  eventsGet.mockResolvedValue({ docs: [] });
  rsvpsGet.mockResolvedValue({ docs: [] });
  sendEventReminderEmail.mockResolvedValue(true);
});

afterEach(() => {
  vi.useRealTimers();
  delete process.env.CRON_SECRET;
});

describe("GET /api/cron/event-reminders", () => {
  it("401s without the correct CRON_SECRET", async () => {
    const { GET } = await import("@/app/api/cron/event-reminders/route");
    const res = await GET(request({ authorization: "Bearer wrong" }));
    expect(res.status).toBe(401);
    expect(eventsGet).not.toHaveBeenCalled();
  });

  it("finds tomorrow's event and emails every RSVP", async () => {
    eventsGet.mockResolvedValue({ docs: [{ id: "e1", data: () => tomorrowEvent }] });
    rsvpsGet.mockResolvedValue({
      docs: [
        { data: () => ({ id: "r1", name: "Aisha Bello", email: "aisha@example.com", guestCount: 1, createdAt: 1 }) },
        { data: () => ({ id: "r2", name: "Chidi Okoye", email: "chidi@example.com", guestCount: 2, createdAt: 2 }) },
      ],
    });

    const { GET } = await import("@/app/api/cron/event-reminders/route");
    const res = await GET(request({ authorization: "Bearer test-secret" }));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toEqual({ ok: true, eventsChecked: 1, emailsSent: 2 });
    expect(where).toHaveBeenCalledWith("date", "==", "2026-09-08");
    expect(sendEventReminderEmail).toHaveBeenCalledWith(
      { name: "Aisha Bello", email: "aisha@example.com" },
      { title: "Sports Day", date: "2026-09-08", desc: "Bring a water bottle." }
    );
    expect(sendEventReminderEmail).toHaveBeenCalledWith(
      { name: "Chidi Okoye", email: "chidi@example.com" },
      { title: "Sports Day", date: "2026-09-08", desc: "Bring a water bottle." }
    );
  });

  it("skips events not happening tomorrow", async () => {
    eventsGet.mockResolvedValue({ docs: [] });

    const { GET } = await import("@/app/api/cron/event-reminders/route");
    const res = await GET(request({ authorization: "Bearer test-secret" }));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toEqual({ ok: true, eventsChecked: 0, emailsSent: 0 });
    expect(sendEventReminderEmail).not.toHaveBeenCalled();
  });

  it("still succeeds when a recipient's send fails", async () => {
    eventsGet.mockResolvedValue({ docs: [{ id: "e1", data: () => tomorrowEvent }] });
    rsvpsGet.mockResolvedValue({
      docs: [{ data: () => ({ id: "r1", name: "Aisha Bello", email: "aisha@example.com", guestCount: 1, createdAt: 1 }) }],
    });
    sendEventReminderEmail.mockRejectedValue(new Error("resend down"));
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const { GET } = await import("@/app/api/cron/event-reminders/route");
    const res = await GET(request({ authorization: "Bearer test-secret" }));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toEqual({ ok: true, eventsChecked: 1, emailsSent: 0 });

    consoleSpy.mockRestore();
  });
});
