import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const verifyIdToken = vi.fn();
const getUser = vi.fn();
const collection = vi.fn();
const siteGet = vi.fn();
const siteSet = vi.fn();
const adminUserGet = vi.fn();

vi.mock("@/lib/firebase/admin", () => ({
  getAdminAuth: () => ({ verifyIdToken, getUser }),
  getAdminDb: () => ({ collection }),
}));

const logAdminAction = vi.fn();
vi.mock("@/lib/audit", () => ({
  logAdminAction: (...args: unknown[]) => logAdminAction(...args),
}));

function getRequest(headers: Record<string, string> = {}) {
  return new NextRequest("http://localhost/api/admin/settings", { headers });
}

function patchRequest(body: unknown, headers: Record<string, string> = {}) {
  return new NextRequest("http://localhost/api/admin/settings", {
    method: "PATCH",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  collection.mockImplementation((path: string) => {
    if (path === "settings") {
      return { doc: () => ({ get: siteGet, set: siteSet }) };
    }
    return { doc: () => ({ get: adminUserGet }) };
  });
  getUser.mockResolvedValue({ disabled: false });
  adminUserGet.mockResolvedValue({ exists: false });
  siteGet.mockResolvedValue({ exists: false });
  siteSet.mockResolvedValue(undefined);
  process.env.ADMIN_EMAILS = "boss@earlydays.example";
  verifyIdToken.mockResolvedValue({ uid: "u1", email: "boss@earlydays.example" });
});

afterEach(() => {
  delete process.env.ADMIN_EMAILS;
  delete process.env.CONTACT_NOTIFY_EMAIL;
});

describe("GET /api/admin/settings", () => {
  it("rejects requests without an Authorization header", async () => {
    const { GET } = await import("@/app/api/admin/settings/route");
    const res = await GET(getRequest());
    expect(res.status).toBe(401);
  });

  it("403s a non-superadmin", async () => {
    delete process.env.ADMIN_EMAILS;
    verifyIdToken.mockResolvedValue({ uid: "u2", email: "blogger@earlydays.example" });
    adminUserGet.mockResolvedValue({ exists: true, data: () => ({ isSuperAdmin: false, areas: ["blog"] }) });

    const { GET } = await import("@/app/api/admin/settings/route");
    const res = await GET(getRequest({ authorization: "Bearer ok" }));
    expect(res.status).toBe(403);
    expect(siteGet).not.toHaveBeenCalled();
  });

  it("returns the stored settings merged over the env-var defaults", async () => {
    process.env.CONTACT_NOTIFY_EMAIL = "office@earlydays.example";
    siteGet.mockResolvedValue({ exists: true, data: () => ({ whatsapp: "2348012345678" }) });

    const { GET } = await import("@/app/api/admin/settings/route");
    const res = await GET(getRequest({ authorization: "Bearer ok" }));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.whatsapp).toBe("2348012345678");
    expect(json.notifyEmail).toBe("office@earlydays.example");
  });
});

describe("PATCH /api/admin/settings", () => {
  it("403s a non-superadmin", async () => {
    delete process.env.ADMIN_EMAILS;
    verifyIdToken.mockResolvedValue({ uid: "u2", email: "blogger@earlydays.example" });
    adminUserGet.mockResolvedValue({ exists: true, data: () => ({ isSuperAdmin: false, areas: ["blog"] }) });

    const { PATCH } = await import("@/app/api/admin/settings/route");
    const res = await PATCH(patchRequest({ whatsapp: "2348012345678" }, { authorization: "Bearer ok" }));
    expect(res.status).toBe(403);
    expect(siteSet).not.toHaveBeenCalled();
  });

  it("rejects a body with nothing to update", async () => {
    const { PATCH } = await import("@/app/api/admin/settings/route");
    const res = await PATCH(patchRequest({}, { authorization: "Bearer ok" }));
    expect(res.status).toBe(400);
    expect(siteSet).not.toHaveBeenCalled();
  });

  it("rejects an invalid WhatsApp number", async () => {
    const { PATCH } = await import("@/app/api/admin/settings/route");
    const res = await PATCH(patchRequest({ whatsapp: "not-a-number" }, { authorization: "Bearer ok" }));
    expect(res.status).toBe(400);
    expect(siteSet).not.toHaveBeenCalled();
  });

  it("rejects an invalid notify email", async () => {
    const { PATCH } = await import("@/app/api/admin/settings/route");
    const res = await PATCH(patchRequest({ notifyEmail: "not-an-email" }, { authorization: "Bearer ok" }));
    expect(res.status).toBe(400);
    expect(siteSet).not.toHaveBeenCalled();
  });

  it("saves valid updates and logs the change", async () => {
    const { PATCH } = await import("@/app/api/admin/settings/route");
    const res = await PATCH(
      patchRequest(
        { whatsapp: "2348012345678", notifyEmail: "office@earlydays.example" },
        { authorization: "Bearer ok" }
      )
    );

    expect(res.status).toBe(200);
    expect(siteSet).toHaveBeenCalledWith(
      expect.objectContaining({
        whatsapp: "2348012345678",
        notifyEmail: "office@earlydays.example",
        updatedBy: "boss@earlydays.example",
      }),
      { merge: true }
    );
    expect(logAdminAction).toHaveBeenCalledWith(
      expect.objectContaining({ action: "settings.site_updated", actorEmail: "boss@earlydays.example" })
    );
  });
});
