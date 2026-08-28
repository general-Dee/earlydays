import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { sendSmsFeeReminder } from "@/lib/sms";

const parent = { guardianName: "Aisha", phone: "08012345678" };
const unpaidChildren = [{ name: "Kid", stage: "N1" }];

beforeEach(() => {
  process.env.TERMII_API_KEY = "test-key";
  process.env.TERMII_SENDER_ID = "Earlydays";
});

afterEach(() => {
  vi.unstubAllGlobals();
  delete process.env.TERMII_API_KEY;
  delete process.env.TERMII_SENDER_ID;
});

describe("sendSmsFeeReminder", () => {
  it("does nothing when Termii isn't configured", async () => {
    delete process.env.TERMII_API_KEY;
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const sent = await sendSmsFeeReminder(parent, unpaidChildren, "Term 1");

    expect(sent).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("does nothing when the phone number doesn't normalize", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const sent = await sendSmsFeeReminder({ ...parent, phone: "not-a-phone" }, unpaidChildren, "Term 1");

    expect(sent).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("sends an SMS to Termii with the normalized phone", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);

    const sent = await sendSmsFeeReminder(parent, unpaidChildren, "Term 1");

    expect(sent).toBe(true);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.ng.termii.com/api/sms/send",
      expect.objectContaining({ method: "POST" })
    );
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.to).toBe("+2348012345678");
    expect(body.from).toBe("Earlydays");
    expect(body.api_key).toBe("test-key");
    expect(body.sms).toContain("Aisha");
    expect(body.sms).toContain("Term 1");
  });

  it("returns false when the API responds with a non-OK status", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }));

    const sent = await sendSmsFeeReminder(parent, unpaidChildren, "Term 1");

    expect(sent).toBe(false);
  });
});
