import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const verifyIdToken = vi.fn();
const getUser = vi.fn();
const collection = vi.fn();
const orderBy = vi.fn();
const get = vi.fn();
const doc = vi.fn();

vi.mock("@/lib/firebase/admin", () => ({
  getAdminAuth: () => ({ verifyIdToken, getUser }),
  getAdminDb: () => ({ collection }),
}));

const sendNewsletterEmail = vi.fn();
vi.mock("@/lib/email/notify", () => ({
  sendNewsletterEmail: (...args: unknown[]) => sendNewsletterEmail(...args),
}));

// resolveAdminIdentity looks up an `adminUsers/{uid}` doc on every request
// before falling back to the ADMIN_EMAILS* env vars — always resolve that
// lookup to "no doc" so the env-var fallback path (what these tests exercise)
// applies.
function resetChain() {
  collection.mockImplementation(() => ({ orderBy, doc, get }));
  orderBy.mockImplementation(() => ({ get }));
  doc.mockImplementation(() => ({ get: () => Promise.resolve({ exists: false }) }));
  sendNewsletterEmail.mockResolvedValue(true);
}

function getRequest(headers: Record<string, string> = {}) {
  return new NextRequest("http://localhost/api/admin/subscribers", { headers });
}

function postRequest(headers: Record<string, string> = {}, body?: unknown) {
  return new NextRequest("http://localhost/api/admin/subscribers", {
    method: "POST",
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

const validSubscriber = { id: "s1", email: "parent@example.com", name: "A Parent", createdAt: 1700000000000 };

beforeEach(() => {
  vi.clearAllMocks();
  getUser.mockResolvedValue({ disabled: false });
  resetChain();
  process.env.ADMIN_EMAILS = "staff@earlydays.example";
  verifyIdToken.mockResolvedValue({ email: "staff@earlydays.example" });
});

afterEach(() => {
  delete process.env.ADMIN_EMAILS;
  delete process.env.ADMIN_EMAILS_SUBSCRIBERS;
});

describe("GET /api/admin/subscribers", () => {
  it("rejects requests without an Authorization header", async () => {
    verifyIdToken.mockReset();
    const { GET } = await import("@/app/api/admin/subscribers/route");
    const res = await GET(getRequest());
    expect(res.status).toBe(401);
  });

  it("403s when the token's email isn't in ADMIN_EMAILS", async () => {
    verifyIdToken.mockResolvedValue({ email: "parent@example.com" });
    const { GET } = await import("@/app/api/admin/subscribers/route");
    const res = await GET(getRequest({ authorization: "Bearer ok" }));
    expect(res.status).toBe(403);
    expect(get).not.toHaveBeenCalled();
  });

  it("returns subscribers ordered by newest first for an allow-listed admin email", async () => {
    get.mockResolvedValue({ docs: [{ data: () => validSubscriber }] });

    const { GET } = await import("@/app/api/admin/subscribers/route");
    const res = await GET(getRequest({ authorization: "Bearer ok" }));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.subscribers).toEqual([validSubscriber]);
    expect(collection).toHaveBeenCalledWith("subscribers");
    expect(orderBy).toHaveBeenCalledWith("createdAt", "desc");
  });

  it("allows an area-scoped admin without full superadmin access", async () => {
    process.env.ADMIN_EMAILS = "";
    process.env.ADMIN_EMAILS_SUBSCRIBERS = "membership@earlydays.example";
    verifyIdToken.mockResolvedValue({ email: "membership@earlydays.example" });
    get.mockResolvedValue({ docs: [] });

    const { GET } = await import("@/app/api/admin/subscribers/route");
    const res = await GET(getRequest({ authorization: "Bearer ok" }));

    expect(res.status).toBe(200);
  });
});

describe("POST /api/admin/subscribers", () => {
  it("rejects requests without an Authorization header", async () => {
    verifyIdToken.mockReset();
    const { POST } = await import("@/app/api/admin/subscribers/route");
    const res = await POST(postRequest({}, { subject: "Hi", body: "Body" }));
    expect(res.status).toBe(401);
  });

  it("403s when the token's email isn't in ADMIN_EMAILS", async () => {
    verifyIdToken.mockResolvedValue({ email: "parent@example.com" });
    const { POST } = await import("@/app/api/admin/subscribers/route");
    const res = await POST(postRequest({ authorization: "Bearer ok" }, { subject: "Hi", body: "Body" }));
    expect(res.status).toBe(403);
    expect(sendNewsletterEmail).not.toHaveBeenCalled();
  });

  it("400s when subject or body is missing", async () => {
    const { POST } = await import("@/app/api/admin/subscribers/route");
    const res = await POST(postRequest({ authorization: "Bearer ok" }, { subject: "  " }));
    expect(res.status).toBe(400);
    expect(sendNewsletterEmail).not.toHaveBeenCalled();
  });

  it("emails every subscriber and returns the emailsSent count", async () => {
    get.mockResolvedValue({
      docs: [
        { data: () => ({ email: "aisha@example.com", name: "Aisha Bello" }) },
        { data: () => ({ email: "chidi@example.com", name: "Chidi Okoye" }) },
      ],
    });

    const { POST } = await import("@/app/api/admin/subscribers/route");
    const res = await POST(postRequest({ authorization: "Bearer ok" }, { subject: "News", body: "Here's what's new." }));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.emailsSent).toBe(2);
    expect(sendNewsletterEmail).toHaveBeenCalledWith(
      { email: "aisha@example.com", name: "Aisha Bello" },
      { subject: "News", body: "Here's what's new." }
    );
    expect(sendNewsletterEmail).toHaveBeenCalledWith(
      { email: "chidi@example.com", name: "Chidi Okoye" },
      { subject: "News", body: "Here's what's new." }
    );
  });

  it("still returns 200 with emailsSent 0 when every send fails", async () => {
    get.mockResolvedValue({ docs: [{ data: () => ({ email: "aisha@example.com", name: "Aisha Bello" }) }] });
    sendNewsletterEmail.mockRejectedValue(new Error("resend down"));
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const { POST } = await import("@/app/api/admin/subscribers/route");
    const res = await POST(postRequest({ authorization: "Bearer ok" }, { subject: "News", body: "Here's what's new." }));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toEqual({ emailsSent: 0 });

    consoleSpy.mockRestore();
  });
});
