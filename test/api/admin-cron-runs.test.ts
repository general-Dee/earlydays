import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const verifyIdToken = vi.fn();
const getUser = vi.fn();
const collection = vi.fn();
const doc = vi.fn();
const docGet = vi.fn();
const orderBy = vi.fn();
const limit = vi.fn();
const listGet = vi.fn();

vi.mock("@/lib/firebase/admin", () => ({
  getAdminAuth: () => ({ verifyIdToken, getUser }),
  getAdminDb: () => ({ collection }),
}));

function getRequest(headers: Record<string, string> = {}) {
  return new NextRequest("http://localhost/api/admin/cron-runs", { headers });
}

beforeEach(() => {
  vi.clearAllMocks();
  collection.mockImplementation(() => ({ doc, orderBy }));
  doc.mockImplementation(() => ({ get: docGet }));
  orderBy.mockImplementation(() => ({ limit }));
  limit.mockImplementation(() => ({ get: listGet }));
  docGet.mockResolvedValue({ exists: false });
  process.env.ADMIN_EMAILS = "boss@earlydays.example";
  verifyIdToken.mockResolvedValue({ uid: "actor1", email: "boss@earlydays.example" });
  getUser.mockResolvedValue({ disabled: false });
});

afterEach(() => {
  delete process.env.ADMIN_EMAILS;
});

describe("GET /api/admin/cron-runs", () => {
  it("401s when the Authorization header is missing", async () => {
    verifyIdToken.mockReset();
    const { GET } = await import("@/app/api/admin/cron-runs/route");
    const res = await GET(getRequest());
    expect(res.status).toBe(401);
  });

  it("403s a non-superadmin", async () => {
    delete process.env.ADMIN_EMAILS;
    verifyIdToken.mockResolvedValue({ uid: "u2", email: "blogger@earlydays.example" });
    docGet.mockResolvedValue({ exists: true, data: () => ({ isSuperAdmin: false, areas: ["blog"] }) });

    const { GET } = await import("@/app/api/admin/cron-runs/route");
    const res = await GET(getRequest({ authorization: "Bearer ok" }));
    expect(res.status).toBe(403);
    expect(listGet).not.toHaveBeenCalled();
  });

  it("returns cron runs ordered by most recent first", async () => {
    const runs = [
      { id: "run2", job: "fee-reminders", createdAt: 200, counts: { emailsSent: 3, whatsappSent: 1, smsSent: 0 }, failures: 0 },
      { id: "run1", job: "event-reminders", createdAt: 100, counts: { eventsChecked: 1, emailsSent: 2 }, failures: 1 },
    ];
    listGet.mockResolvedValue({
      docs: runs.map((run) => ({ id: run.id, data: () => run })),
    });

    const { GET } = await import("@/app/api/admin/cron-runs/route");
    const res = await GET(getRequest({ authorization: "Bearer ok" }));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.runs).toEqual(runs);
    expect(collection).toHaveBeenCalledWith("cronRuns");
    expect(orderBy).toHaveBeenCalledWith("createdAt", "desc");
    expect(limit).toHaveBeenCalledWith(500);
  });
});
