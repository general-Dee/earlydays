import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { sendWhatsAppFeeReminder } from "@/lib/whatsapp";

const parent = { guardianName: "Aisha", phone: "08012345678" };
const unpaidChildren = [{ name: "Kid", stage: "N1" }];

beforeEach(() => {
  process.env.WHATSAPP_PHONE_NUMBER_ID = "123456";
  process.env.WHATSAPP_ACCESS_TOKEN = "test-token";
  process.env.WHATSAPP_TEMPLATE_NAME = "fee_reminder";
  process.env.WHATSAPP_TEMPLATE_LANG = "en_US";
});

afterEach(() => {
  vi.unstubAllGlobals();
  delete process.env.WHATSAPP_PHONE_NUMBER_ID;
  delete process.env.WHATSAPP_ACCESS_TOKEN;
  delete process.env.WHATSAPP_TEMPLATE_NAME;
  delete process.env.WHATSAPP_TEMPLATE_LANG;
});

describe("sendWhatsAppFeeReminder", () => {
  it("does nothing when WhatsApp isn't configured", async () => {
    delete process.env.WHATSAPP_ACCESS_TOKEN;
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const sent = await sendWhatsAppFeeReminder(parent, unpaidChildren, "Term 1");

    expect(sent).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("does nothing when the phone number doesn't normalize", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const sent = await sendWhatsAppFeeReminder({ ...parent, phone: "not-a-phone" }, unpaidChildren, "Term 1");

    expect(sent).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("sends a template message to the Graph API with the normalized phone", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);

    const sent = await sendWhatsAppFeeReminder(parent, unpaidChildren, "Term 1");

    expect(sent).toBe(true);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://graph.facebook.com/v20.0/123456/messages",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ Authorization: "Bearer test-token" }),
      })
    );
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.to).toBe("+2348012345678");
    expect(body.template.name).toBe("fee_reminder");
    expect(body.template.components[0].parameters[0].text).toBe("Aisha");
  });

  it("returns false when the API responds with a non-OK status", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }));

    const sent = await sendWhatsAppFeeReminder(parent, unpaidChildren, "Term 1");

    expect(sent).toBe(false);
  });
});
