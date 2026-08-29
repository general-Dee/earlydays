import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const send = vi.fn();

vi.mock("resend", () => ({
  Resend: vi.fn().mockImplementation(() => ({ emails: { send } })),
}));

beforeEach(() => {
  vi.clearAllMocks();
  process.env.RESEND_API_KEY = "re_test";
  process.env.CONTACT_FROM_EMAIL = "school@earlydays.example";
  send.mockResolvedValue({});
});

afterEach(() => {
  delete process.env.RESEND_API_KEY;
  delete process.env.CONTACT_FROM_EMAIL;
});

describe("sendPaymentReceiptEmail", () => {
  it("includes a link back to the portal receipt page", async () => {
    const { sendPaymentReceiptEmail } = await import("@/lib/email/notify");
    const { site } = await import("@/lib/data");

    const sent = await sendPaymentReceiptEmail(
      { guardianName: "Aisha", email: "a@b.com" },
      { childName: "Zainab", term: "Term 3", amountKobo: 60_000_00, reference: "edy_1" }
    );

    expect(sent).toBe(true);
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "a@b.com",
        text: expect.stringContaining(`${site.url}/portal/receipts/edy_1`),
      })
    );
  });

  it("does nothing when Resend isn't configured", async () => {
    delete process.env.RESEND_API_KEY;
    const { sendPaymentReceiptEmail } = await import("@/lib/email/notify");

    const sent = await sendPaymentReceiptEmail(
      { guardianName: "Aisha", email: "a@b.com" },
      { childName: "Zainab", term: "Term 3", amountKobo: 60_000_00, reference: "edy_1" }
    );

    expect(sent).toBe(false);
    expect(send).not.toHaveBeenCalled();
  });
});

describe("sendFeeReminderEmail", () => {
  it("includes the guardian, term, and fee amount from the fee map", async () => {
    const { sendFeeReminderEmail } = await import("@/lib/email/notify");

    const sent = await sendFeeReminderEmail(
      { guardianName: "Aisha", email: "a@b.com" },
      [{ name: "Zainab", stage: "N1" }],
      "Term 3",
      { N1: 60_000_00 }
    );

    expect(sent).toBe(true);
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "a@b.com",
        text: expect.stringContaining("Term 3"),
      })
    );
    const text = send.mock.calls[0][0].text as string;
    expect(text).toContain("Zainab");
    expect(text).toContain("60,000");
  });

  it("falls back to a generic message for a stage with no configured fee", async () => {
    const { sendFeeReminderEmail } = await import("@/lib/email/notify");

    await sendFeeReminderEmail(
      { guardianName: "Aisha", email: "a@b.com" },
      [{ name: "Zainab", stage: "N1" }],
      "Term 3",
      {}
    );

    const text = send.mock.calls[0][0].text as string;
    expect(text).toContain("contact the school for the fee amount");
  });

  it("does nothing when there are no unpaid children", async () => {
    const { sendFeeReminderEmail } = await import("@/lib/email/notify");

    const sent = await sendFeeReminderEmail({ guardianName: "Aisha", email: "a@b.com" }, [], "Term 3", {});

    expect(sent).toBe(false);
    expect(send).not.toHaveBeenCalled();
  });
});
