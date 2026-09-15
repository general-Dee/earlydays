import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const getAdminAccessToken = vi.fn();
vi.mock("@/lib/firebase/admin", () => ({
  getAdminAccessToken: () => getAdminAccessToken(),
}));

const recordCronRun = vi.fn();
vi.mock("@/lib/cronRuns", () => ({
  recordCronRun: (...args: unknown[]) => recordCronRun(...args),
}));

function request(headers: Record<string, string> = {}) {
  return new NextRequest("http://localhost/api/cron/firestore-backup", { headers });
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.CRON_SECRET = "test-secret";
  process.env.FIREBASE_ADMIN_PROJECT_ID = "test-project";
  process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET = "test-project.appspot.com";
  getAdminAccessToken.mockResolvedValue("fake-access-token");
});

afterEach(() => {
  vi.unstubAllGlobals();
  delete process.env.CRON_SECRET;
  delete process.env.FIREBASE_ADMIN_PROJECT_ID;
  delete process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
});

describe("GET /api/cron/firestore-backup", () => {
  it("401s without the correct CRON_SECRET", async () => {
    const { GET } = await import("@/app/api/cron/firestore-backup/route");
    const res = await GET(request({ authorization: "Bearer wrong" }));
    expect(res.status).toBe(401);
    expect(getAdminAccessToken).not.toHaveBeenCalled();
  });

  it("401s when CRON_SECRET isn't configured", async () => {
    delete process.env.CRON_SECRET;
    const { GET } = await import("@/app/api/cron/firestore-backup/route");
    const res = await GET(request({ authorization: "Bearer test-secret" }));
    expect(res.status).toBe(401);
  });

  it("requests a Firestore export and records success", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, text: async () => "" });
    vi.stubGlobal("fetch", fetchMock);

    const { GET } = await import("@/app/api/cron/firestore-backup/route");
    const res = await GET(request({ authorization: "Bearer test-secret" }));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(json.outputUriPrefix).toMatch(/^gs:\/\/test-project\.appspot\.com\/firestore-backups\//);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://firestore.googleapis.com/v1/projects/test-project/databases/(default):exportDocuments",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ Authorization: "Bearer fake-access-token" }),
      })
    );
    expect(recordCronRun).toHaveBeenCalledWith({
      job: "firestore-backup",
      counts: { exportRequested: 1 },
      failures: 0,
    });
  });

  it("records a failure and still returns 200 when Firestore's API responds non-2xx", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 403, text: async () => "permission denied" }));

    const { GET } = await import("@/app/api/cron/firestore-backup/route");
    const res = await GET(request({ authorization: "Bearer test-secret" }));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.ok).toBe(false);
    expect(recordCronRun).toHaveBeenCalledWith({
      job: "firestore-backup",
      counts: { exportRequested: 0 },
      failures: 1,
    });
  });

  it("records a failure and still returns 200 when getting an access token throws", async () => {
    getAdminAccessToken.mockRejectedValue(new Error("credential not configured"));

    const { GET } = await import("@/app/api/cron/firestore-backup/route");
    const res = await GET(request({ authorization: "Bearer test-secret" }));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.ok).toBe(false);
    expect(recordCronRun).toHaveBeenCalledWith({
      job: "firestore-backup",
      counts: { exportRequested: 0 },
      failures: 1,
    });
  });

  it("500s when the project ID or bucket aren't configured", async () => {
    delete process.env.FIREBASE_ADMIN_PROJECT_ID;

    const { GET } = await import("@/app/api/cron/firestore-backup/route");
    const res = await GET(request({ authorization: "Bearer test-secret" }));

    expect(res.status).toBe(500);
    expect(getAdminAccessToken).not.toHaveBeenCalled();
  });
});
