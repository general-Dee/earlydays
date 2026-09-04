import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const eventGet = vi.fn();
const rsvpSet = vi.fn();
const sendRsvpNotification = vi.fn();
const checkRateLimit = vi.fn();

const collection = vi.fn((path: string) => {
  if (path === "events") {
    return { doc: () => ({ get: eventGet }) };
  }
  // Subcollection path, e.g. "events/e1/rsvps"
  return { doc: () => ({ id: "r1", set: rsvpSet }) };
});

vi.mock("@/lib/firebase/admin", () => ({
  getAdminDb: () => ({ collection }),
}));

vi.mock("@/lib/email/notify", () => ({
  sendRsvpNotification: (...args: unknown[]) => sendRsvpNotification(...args),
}));

vi.mock("@/lib/rate-limit", () => ({
  getClientIp: () => "1.2.3.4",
  checkRateLimit: (...args: unknown[]) => checkRateLimit(...args),
}));

function jsonRequest(body: unknown) {
  return new NextRequest("http://localhost/api/events/e1/rsvp", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

const params = { params: { id: "e1" } };

beforeEach(() => {
  vi.clearAllMocks();
  eventGet.mockResolvedValue({ exists: true, data: () => ({ title: "Open Day" }) });
  rsvpSet.mockResolvedValue(undefined);
  sendRsvpNotification.mockResolvedValue(undefined);
  checkRateLimit.mockResolvedValue(true);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("POST /api/events/[id]/rsvp", () => {
  it("returns ok without writing when the honeypot is filled", async () => {
    const { POST } = await import("@/app/api/events/[id]/rsvp/route");
    const res = await POST(jsonRequest({ name: "Bot", email: "bot@example.com", hp: "filled" }), params);
    const json = await res.json();

    expect(json).toEqual({ ok: true });
    expect(rsvpSet).not.toHaveBeenCalled();
  });

  it("404s when the event doesn't exist", async () => {
    eventGet.mockResolvedValue({ exists: false });
    const { POST } = await import("@/app/api/events/[id]/rsvp/route");
    const res = await POST(jsonRequest({ name: "Aisha", email: "a@b.com" }), params);
    expect(res.status).toBe(404);
    expect(rsvpSet).not.toHaveBeenCalled();
  });

  it("requires a name and email", async () => {
    const { POST } = await import("@/app/api/events/[id]/rsvp/route");
    const res = await POST(jsonRequest({ name: "Aisha" }), params);
    expect(res.status).toBe(400);
    expect(rsvpSet).not.toHaveBeenCalled();
  });

  it("saves the RSVP and notifies staff", async () => {
    const { POST } = await import("@/app/api/events/[id]/rsvp/route");
    const res = await POST(jsonRequest({ name: "Aisha", email: "a@b.com", guestCount: 2 }), params);
    const json = await res.json();

    expect(json).toEqual({ ok: true });
    expect(rsvpSet).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Aisha", email: "a@b.com", guestCount: 2 })
    );
    expect(sendRsvpNotification).toHaveBeenCalledWith("Open Day", expect.objectContaining({ name: "Aisha" }));
  });

  it("still returns ok when the notification email fails to send", async () => {
    sendRsvpNotification.mockRejectedValue(new Error("resend down"));
    const { POST } = await import("@/app/api/events/[id]/rsvp/route");
    const res = await POST(jsonRequest({ name: "Aisha", email: "a@b.com" }), params);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toEqual({ ok: true });
    expect(rsvpSet).toHaveBeenCalled();
  });

  it("returns 429 and skips the write when rate limited", async () => {
    checkRateLimit.mockResolvedValue(false);
    const { POST } = await import("@/app/api/events/[id]/rsvp/route");
    const res = await POST(jsonRequest({ name: "Aisha", email: "a@b.com" }), params);
    const json = await res.json();

    expect(res.status).toBe(429);
    expect(json).toEqual({ error: "Too many requests. Please try again later." });
    expect(rsvpSet).not.toHaveBeenCalled();
  });
});
