import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const collectionAdd = vi.fn();
const collection = vi.fn();
const sendApplicationNotification = vi.fn();

vi.mock("@/lib/firebase/admin", () => ({
  getAdminDb: () => ({ collection }),
}));

vi.mock("@/lib/email/notify", () => ({
  sendApplicationNotification: (...args: unknown[]) => sendApplicationNotification(...args),
}));

collection.mockImplementation(() => ({ add: collectionAdd }));

function jsonRequest(body: unknown) {
  return new NextRequest("http://localhost/api/admissions/apply", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

const validBody = {
  childName: "Femi Okafor",
  childDob: "2021-03-01",
  desiredStage: "CR",
  guardianName: "Aisha Okafor",
  email: "a@b.com",
};

beforeEach(() => {
  vi.clearAllMocks();
  collection.mockImplementation(() => ({ add: collectionAdd }));
  collectionAdd.mockResolvedValue(undefined);
  sendApplicationNotification.mockResolvedValue(undefined);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("POST /api/admissions/apply", () => {
  it("returns ok without writing or notifying when the honeypot is filled", async () => {
    const { POST } = await import("@/app/api/admissions/apply/route");
    const res = await POST(jsonRequest({ ...validBody, hp: "filled" }));
    const json = await res.json();

    expect(json).toEqual({ ok: true });
    expect(collectionAdd).not.toHaveBeenCalled();
    expect(sendApplicationNotification).not.toHaveBeenCalled();
  });

  it("requires child name, DOB, and guardian name", async () => {
    const { POST } = await import("@/app/api/admissions/apply/route");
    const res = await POST(jsonRequest({ email: "a@b.com" }));
    expect(res.status).toBe(400);
    expect(collectionAdd).not.toHaveBeenCalled();
  });

  it("rejects an invalid desired stage", async () => {
    const { POST } = await import("@/app/api/admissions/apply/route");
    const res = await POST(jsonRequest({ ...validBody, desiredStage: "not-a-real-stage" }));
    expect(res.status).toBe(400);
    expect(collectionAdd).not.toHaveBeenCalled();
  });

  it("rejects notes that are too long", async () => {
    const { POST } = await import("@/app/api/admissions/apply/route");
    const res = await POST(jsonRequest({ ...validBody, notes: "x".repeat(2001) }));
    expect(res.status).toBe(400);
  });

  it("requires an email or phone number", async () => {
    const { POST } = await import("@/app/api/admissions/apply/route");
    const res = await POST(jsonRequest({ ...validBody, email: undefined }));
    expect(res.status).toBe(400);
  });

  it("saves the application and sends a notification", async () => {
    const { POST } = await import("@/app/api/admissions/apply/route");
    const res = await POST(jsonRequest(validBody));
    const json = await res.json();

    expect(json).toEqual({ ok: true });
    expect(collectionAdd).toHaveBeenCalledWith(
      expect.objectContaining({
        childName: "Femi Okafor",
        childDob: "2021-03-01",
        desiredStage: "CR",
        guardianName: "Aisha Okafor",
        email: "a@b.com",
        phone: null,
        status: "new",
      })
    );
    expect(sendApplicationNotification).toHaveBeenCalledWith(
      expect.objectContaining({ childName: "Femi Okafor", guardianName: "Aisha Okafor" })
    );
  });

  it("still returns ok when the notification email fails to send", async () => {
    sendApplicationNotification.mockRejectedValue(new Error("resend down"));
    const { POST } = await import("@/app/api/admissions/apply/route");
    const res = await POST(jsonRequest(validBody));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toEqual({ ok: true });
    expect(collectionAdd).toHaveBeenCalled();
  });
});
