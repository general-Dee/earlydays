import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const verifyIdToken = vi.fn();
const collection = vi.fn();
const orderBy = vi.fn();
const get = vi.fn();
const add = vi.fn();

vi.mock("@/lib/firebase/admin", () => ({
  getAdminAuth: () => ({ verifyIdToken }),
  getAdminDb: () => ({ collection }),
}));

collection.mockImplementation(() => ({ orderBy, add }));
orderBy.mockImplementation(() => ({ get }));

function getRequest(headers: Record<string, string> = {}) {
  return new NextRequest("http://localhost/api/admin/events", { headers });
}

function postRequest(headers: Record<string, string> = {}, body?: unknown) {
  return new NextRequest("http://localhost/api/admin/events", {
    method: "POST",
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

const validEvent = { title: "Term Starts", date: "2026-09-01", tag: "All Stages", desc: "First day of term." };

beforeEach(() => {
  vi.clearAllMocks();
  collection.mockImplementation(() => ({ orderBy, add }));
  orderBy.mockImplementation(() => ({ get }));
});

afterEach(() => {
  delete process.env.ADMIN_EMAILS;
  delete process.env.ADMIN_EMAILS_EVENTS;
});

describe("GET /api/admin/events", () => {
  it("rejects requests without an Authorization header", async () => {
    const { GET } = await import("@/app/api/admin/events/route");
    const res = await GET(getRequest());
    expect(res.status).toBe(401);
  });

  it("rejects an invalid token", async () => {
    verifyIdToken.mockRejectedValue(new Error("bad token"));
    const { GET } = await import("@/app/api/admin/events/route");
    const res = await GET(getRequest({ authorization: "Bearer bad" }));
    expect(res.status).toBe(401);
  });

  it("403s when the token's email isn't in ADMIN_EMAILS", async () => {
    process.env.ADMIN_EMAILS = "staff@earlydays.example";
    verifyIdToken.mockResolvedValue({ email: "parent@example.com" });
    const { GET } = await import("@/app/api/admin/events/route");
    const res = await GET(getRequest({ authorization: "Bearer ok" }));
    expect(res.status).toBe(403);
    expect(get).not.toHaveBeenCalled();
  });

  it("returns events ordered by date for an allow-listed admin email", async () => {
    process.env.ADMIN_EMAILS = "staff@earlydays.example";
    verifyIdToken.mockResolvedValue({ email: "staff@earlydays.example" });
    get.mockResolvedValue({
      docs: [{ id: "e1", data: () => validEvent }],
    });

    const { GET } = await import("@/app/api/admin/events/route");
    const res = await GET(getRequest({ authorization: "Bearer ok" }));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.events).toEqual([{ id: "e1", ...validEvent }]);
    expect(collection).toHaveBeenCalledWith("events");
    expect(orderBy).toHaveBeenCalledWith("date", "asc");
  });
});

describe("POST /api/admin/events", () => {
  it("rejects requests without an Authorization header", async () => {
    const { POST } = await import("@/app/api/admin/events/route");
    const res = await POST(postRequest({}, validEvent));
    expect(res.status).toBe(401);
  });

  it("403s when the token's email isn't in ADMIN_EMAILS", async () => {
    process.env.ADMIN_EMAILS = "staff@earlydays.example";
    verifyIdToken.mockResolvedValue({ email: "parent@example.com" });
    const { POST } = await import("@/app/api/admin/events/route");
    const res = await POST(postRequest({ authorization: "Bearer ok" }, validEvent));
    expect(res.status).toBe(403);
    expect(add).not.toHaveBeenCalled();
  });

  it("400s when a required field is missing", async () => {
    process.env.ADMIN_EMAILS = "staff@earlydays.example";
    verifyIdToken.mockResolvedValue({ email: "staff@earlydays.example" });
    const { POST } = await import("@/app/api/admin/events/route");
    const res = await POST(postRequest({ authorization: "Bearer ok" }, { title: "Only Title" }));
    expect(res.status).toBe(400);
    expect(add).not.toHaveBeenCalled();
  });

  it("400s when the date isn't in YYYY-MM-DD format", async () => {
    process.env.ADMIN_EMAILS = "staff@earlydays.example";
    verifyIdToken.mockResolvedValue({ email: "staff@earlydays.example" });
    const { POST } = await import("@/app/api/admin/events/route");
    const res = await POST(
      postRequest({ authorization: "Bearer ok" }, { ...validEvent, date: "09/01/2026" })
    );
    expect(res.status).toBe(400);
    expect(add).not.toHaveBeenCalled();
  });

  it("400s when the title exceeds the max length", async () => {
    process.env.ADMIN_EMAILS = "staff@earlydays.example";
    verifyIdToken.mockResolvedValue({ email: "staff@earlydays.example" });
    const { POST } = await import("@/app/api/admin/events/route");
    const res = await POST(
      postRequest({ authorization: "Bearer ok" }, { ...validEvent, title: "a".repeat(201) })
    );
    expect(res.status).toBe(400);
    expect(add).not.toHaveBeenCalled();
  });

  it("400s when the tag exceeds the max length", async () => {
    process.env.ADMIN_EMAILS = "staff@earlydays.example";
    verifyIdToken.mockResolvedValue({ email: "staff@earlydays.example" });
    const { POST } = await import("@/app/api/admin/events/route");
    const res = await POST(
      postRequest({ authorization: "Bearer ok" }, { ...validEvent, tag: "a".repeat(61) })
    );
    expect(res.status).toBe(400);
    expect(add).not.toHaveBeenCalled();
  });

  it("400s when the description exceeds the max length", async () => {
    process.env.ADMIN_EMAILS = "staff@earlydays.example";
    verifyIdToken.mockResolvedValue({ email: "staff@earlydays.example" });
    const { POST } = await import("@/app/api/admin/events/route");
    const res = await POST(
      postRequest({ authorization: "Bearer ok" }, { ...validEvent, desc: "a".repeat(501) })
    );
    expect(res.status).toBe(400);
    expect(add).not.toHaveBeenCalled();
  });

  it("creates an event for an allow-listed admin email", async () => {
    process.env.ADMIN_EMAILS = "Staff@Earlydays.example";
    verifyIdToken.mockResolvedValue({ email: "staff@earlydays.example" });
    add.mockResolvedValue({ id: "e1" });

    const { POST } = await import("@/app/api/admin/events/route");
    const res = await POST(postRequest({ authorization: "Bearer ok" }, validEvent));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toMatchObject({
      id: "e1",
      title: validEvent.title,
      date: validEvent.date,
      tag: validEvent.tag,
      desc: validEvent.desc,
      createdBy: "staff@earlydays.example",
    });
    expect(typeof json.createdAt).toBe("number");
    expect(collection).toHaveBeenCalledWith("events");
    expect(add).toHaveBeenCalledWith(
      expect.objectContaining({
        title: validEvent.title,
        date: validEvent.date,
        tag: validEvent.tag,
        desc: validEvent.desc,
        createdBy: "staff@earlydays.example",
      })
    );
  });
});
