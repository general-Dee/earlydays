import { beforeEach, describe, expect, it, vi } from "vitest";

const collection = vi.fn();
const doc = vi.fn();
const set = vi.fn();

vi.mock("@/lib/firebase/admin", () => ({
  getAdminDb: () => ({ collection }),
}));

const logRouteError = vi.fn();
vi.mock("@/lib/api/errors", () => ({
  logRouteError: (...args: unknown[]) => logRouteError(...args),
}));

beforeEach(() => {
  vi.clearAllMocks();
  collection.mockImplementation(() => ({ doc }));
  doc.mockImplementation(() => ({ id: "run1", set }));
  set.mockResolvedValue(undefined);
});

describe("recordCronRun", () => {
  it("writes an entry with the given job, counts, and failures", async () => {
    const { recordCronRun } = await import("@/lib/cronRuns");

    await recordCronRun({
      job: "event-reminders",
      counts: { eventsChecked: 1, emailsSent: 2 },
      failures: 0,
    });

    expect(collection).toHaveBeenCalledWith("cronRuns");
    expect(set).toHaveBeenCalledWith({
      id: "run1",
      job: "event-reminders",
      createdAt: expect.any(Number),
      counts: { eventsChecked: 1, emailsSent: 2 },
      failures: 0,
    });
  });

  it("swallows a Firestore write failure instead of throwing", async () => {
    set.mockRejectedValue(new Error("firestore down"));
    const { recordCronRun } = await import("@/lib/cronRuns");

    await expect(
      recordCronRun({ job: "fee-reminders", counts: { emailsSent: 0 }, failures: 0 })
    ).resolves.toBeUndefined();

    expect(logRouteError).toHaveBeenCalledWith(
      "recordCronRun",
      expect.stringContaining("fee-reminders"),
      expect.any(Error)
    );
  });
});
