import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const verifyIdToken = vi.fn();
const getUser = vi.fn();
const collection = vi.fn();
const orderBy = vi.fn();
const get = vi.fn();
const doc = vi.fn();
const eventGet = vi.fn();
let docCalls = 0;

vi.mock("@/lib/firebase/admin", () => ({
  getAdminAuth: () => ({ verifyIdToken, getUser }),
  getAdminDb: () => ({ collection }),
}));

// resolveAdminIdentity looks up an `adminUsers/{uid}` doc on every request
// before falling back to the ADMIN_EMAILS* env vars — always resolve that
// lookup to "no doc" so the env-var fallback path (what these tests exercise)
// applies. The route itself then does its own `doc()` call to check the
// event exists before its RSVP query goes through `collection`/`orderBy`.
function resetChain() {
  docCalls = 0;
  collection.mockImplementation(() => ({ orderBy, doc }));
  orderBy.mockImplementation(() => ({ get }));
  doc.mockImplementation(() =>
    docCalls++ === 0 ? { get: () => Promise.resolve({ exists: false }) } : { get: eventGet }
  );
}

function getRequest(headers: Record<string, string> = {}) {
  return new NextRequest("http://localhost/api/admin/events/e1/rsvps", { headers });
}

function context(id = "e1") {
  return { params: { id } };
}

const validRsvp = {
  id: "r1",
  name: "A Parent",
  email: "parent@example.com",
  phone: "08012345678",
  guestCount: 2,
  createdAt: 1700000000000,
};

beforeEach(() => {
  vi.clearAllMocks();
  getUser.mockResolvedValue({ disabled: false });
  resetChain();
  process.env.ADMIN_EMAILS = "staff@earlydays.example";
  verifyIdToken.mockResolvedValue({ email: "staff@earlydays.example" });
  eventGet.mockResolvedValue({ exists: true });
});

afterEach(() => {
  delete process.env.ADMIN_EMAILS;
  delete process.env.ADMIN_EMAILS_EVENTS;
});

describe("GET /api/admin/events/[id]/rsvps", () => {
  it("rejects requests without an Authorization header", async () => {
    verifyIdToken.mockReset();
    const { GET } = await import("@/app/api/admin/events/[id]/rsvps/route");
    const res = await GET(getRequest(), context());
    expect(res.status).toBe(401);
  });

  it("403s when the token's email isn't in ADMIN_EMAILS", async () => {
    verifyIdToken.mockResolvedValue({ email: "parent@example.com" });
    const { GET } = await import("@/app/api/admin/events/[id]/rsvps/route");
    const res = await GET(getRequest({ authorization: "Bearer ok" }), context());
    expect(res.status).toBe(403);
    expect(get).not.toHaveBeenCalled();
  });

  it("404s when the event doesn't exist", async () => {
    eventGet.mockResolvedValue({ exists: false });

    const { GET } = await import("@/app/api/admin/events/[id]/rsvps/route");
    const res = await GET(getRequest({ authorization: "Bearer ok" }), context());

    expect(res.status).toBe(404);
    expect(orderBy).not.toHaveBeenCalled();
  });

  it("returns the event's RSVPs ordered oldest first for an allow-listed admin email", async () => {
    get.mockResolvedValue({ docs: [{ data: () => validRsvp }] });

    const { GET } = await import("@/app/api/admin/events/[id]/rsvps/route");
    const res = await GET(getRequest({ authorization: "Bearer ok" }), context());
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.rsvps).toEqual([validRsvp]);
    expect(collection).toHaveBeenCalledWith("events/e1/rsvps");
    expect(orderBy).toHaveBeenCalledWith("createdAt", "asc");
  });

  it("scopes the query to the event id in the route params", async () => {
    get.mockResolvedValue({ docs: [] });

    const { GET } = await import("@/app/api/admin/events/[id]/rsvps/route");
    await GET(getRequest({ authorization: "Bearer ok" }), context("e2"));

    expect(collection).toHaveBeenCalledWith("events/e2/rsvps");
  });
});
