import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const collectionAdd = vi.fn();
const collection = vi.fn();
const sendContactNotification = vi.fn();

vi.mock("@/lib/firebase/admin", () => ({
  getAdminDb: () => ({ collection }),
}));

vi.mock("@/lib/email/notify", () => ({
  sendContactNotification: (...args: unknown[]) => sendContactNotification(...args),
}));

collection.mockImplementation(() => ({ add: collectionAdd }));

function jsonRequest(body: unknown) {
  return new NextRequest("http://localhost/api/contact", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  collection.mockImplementation(() => ({ add: collectionAdd }));
  collectionAdd.mockResolvedValue(undefined);
  sendContactNotification.mockResolvedValue(undefined);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("POST /api/contact", () => {
  it("returns ok without writing or notifying when the honeypot is filled", async () => {
    const { POST } = await import("@/app/api/contact/route");
    const res = await POST(jsonRequest({ name: "Bot", message: "spam", email: "a@b.com", hp: "filled" }));
    const json = await res.json();

    expect(json).toEqual({ ok: true });
    expect(collectionAdd).not.toHaveBeenCalled();
    expect(sendContactNotification).not.toHaveBeenCalled();
  });

  it("requires a name and message", async () => {
    const { POST } = await import("@/app/api/contact/route");
    const res = await POST(jsonRequest({ email: "a@b.com" }));
    expect(res.status).toBe(400);
    expect(collectionAdd).not.toHaveBeenCalled();
  });

  it("rejects a message that's too long", async () => {
    const { POST } = await import("@/app/api/contact/route");
    const res = await POST(
      jsonRequest({ name: "Aisha", message: "x".repeat(2001), email: "a@b.com" })
    );
    expect(res.status).toBe(400);
  });

  it("requires an email or phone number", async () => {
    const { POST } = await import("@/app/api/contact/route");
    const res = await POST(jsonRequest({ name: "Aisha", message: "Hi there" }));
    expect(res.status).toBe(400);
  });

  it("saves the inquiry and sends a notification", async () => {
    const { POST } = await import("@/app/api/contact/route");
    const res = await POST(
      jsonRequest({ name: "Aisha", message: "I'd like to book a tour.", email: "a@b.com" })
    );
    const json = await res.json();

    expect(json).toEqual({ ok: true });
    expect(collectionAdd).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Aisha",
        email: "a@b.com",
        phone: null,
        message: "I'd like to book a tour.",
        status: "new",
      })
    );
    expect(sendContactNotification).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Aisha", email: "a@b.com" })
    );
  });

  it("still returns ok when the notification email fails to send", async () => {
    sendContactNotification.mockRejectedValue(new Error("resend down"));
    const { POST } = await import("@/app/api/contact/route");
    const res = await POST(
      jsonRequest({ name: "Aisha", message: "I'd like to book a tour.", email: "a@b.com" })
    );
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toEqual({ ok: true });
    expect(collectionAdd).toHaveBeenCalled();
  });
});
