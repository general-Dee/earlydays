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
  doc.mockImplementation(() => ({ id: "log1", set }));
  set.mockResolvedValue(undefined);
});

describe("logAdminAction", () => {
  it("writes an entry with the given fields, omitting optional fields when absent", async () => {
    const { logAdminAction } = await import("@/lib/audit");

    await logAdminAction({ action: "admin.created", actorEmail: "boss@earlydays.example" });

    expect(collection).toHaveBeenCalledWith("auditLog");
    expect(set).toHaveBeenCalledWith({
      id: "log1",
      action: "admin.created",
      actorEmail: "boss@earlydays.example",
      createdAt: expect.any(Number),
    });
  });

  it("includes targetUid, targetEmail, and detail when provided", async () => {
    const { logAdminAction } = await import("@/lib/audit");

    await logAdminAction({
      action: "admin.created",
      actorEmail: "boss@earlydays.example",
      targetUid: "u1",
      targetEmail: "new@earlydays.example",
      detail: "blog, gallery",
    });

    expect(set).toHaveBeenCalledWith(
      expect.objectContaining({
        targetUid: "u1",
        targetEmail: "new@earlydays.example",
        detail: "blog, gallery",
      })
    );
  });

  it("swallows a Firestore write failure instead of throwing", async () => {
    set.mockRejectedValue(new Error("firestore down"));
    const { logAdminAction } = await import("@/lib/audit");

    await expect(
      logAdminAction({ action: "admin.created", actorEmail: "boss@earlydays.example" })
    ).resolves.toBeUndefined();

    expect(logRouteError).toHaveBeenCalledWith(
      "logAdminAction",
      expect.stringContaining("admin.created"),
      expect.any(Error)
    );
  });
});
