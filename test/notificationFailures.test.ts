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
  doc.mockImplementation(() => ({ id: "fail1", set }));
  set.mockResolvedValue(undefined);
});

describe("recordNotificationFailure", () => {
  it("writes an entry with the given job, channel, recipient, and reason", async () => {
    const { recordNotificationFailure } = await import("@/lib/notificationFailures");

    await recordNotificationFailure({
      job: "fee-reminders",
      channel: "email",
      recipientUid: "u1",
      recipientLabel: "Aisha Bello",
      reason: "Email wasn't sent (Resend may not be configured)",
    });

    expect(collection).toHaveBeenCalledWith("notificationFailures");
    expect(set).toHaveBeenCalledWith({
      id: "fail1",
      job: "fee-reminders",
      channel: "email",
      recipientLabel: "Aisha Bello",
      reason: "Email wasn't sent (Resend may not be configured)",
      createdAt: expect.any(Number),
      recipientUid: "u1",
    });
  });

  it("omits recipientUid when not given (e.g. event-reminders)", async () => {
    const { recordNotificationFailure } = await import("@/lib/notificationFailures");

    await recordNotificationFailure({
      job: "event-reminders",
      channel: "email",
      recipientLabel: "Chidi Okoro",
      reason: "network down",
    });

    expect(set).toHaveBeenCalledWith({
      id: "fail1",
      job: "event-reminders",
      channel: "email",
      recipientLabel: "Chidi Okoro",
      reason: "network down",
      createdAt: expect.any(Number),
    });
  });

  it("redacts email/phone-shaped substrings from the reason", async () => {
    const { recordNotificationFailure } = await import("@/lib/notificationFailures");

    await recordNotificationFailure({
      job: "fee-reminders",
      channel: "sms",
      recipientLabel: "Bola Adeyemi",
      reason: "failed for bola@example.com at +234 801 234 5678",
    });

    expect(set).toHaveBeenCalledWith(
      expect.objectContaining({ reason: "failed for [redacted-email] at [redacted-phone]" })
    );
  });

  it("swallows a Firestore write failure instead of throwing", async () => {
    set.mockRejectedValue(new Error("firestore down"));
    const { recordNotificationFailure } = await import("@/lib/notificationFailures");

    await expect(
      recordNotificationFailure({
        job: "fee-reminders",
        channel: "whatsapp",
        recipientLabel: "Aisha Bello",
        reason: "some error",
      })
    ).resolves.toBeUndefined();

    expect(logRouteError).toHaveBeenCalledWith(
      "recordNotificationFailure",
      expect.stringContaining("fee-reminders"),
      expect.any(Error)
    );
  });
});
