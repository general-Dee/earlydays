import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CURRENT_TERM } from "@/lib/fees";

const verifyIdToken = vi.fn();
const collection = vi.fn();
const applicationsGet = vi.fn();
const inquiriesGet = vi.fn();
const parentsGet = vi.fn();
const paymentsGet = vi.fn();

vi.mock("@/lib/firebase/admin", () => ({
  getAdminAuth: () => ({ verifyIdToken }),
  getAdminDb: () => ({ collection }),
}));

function request(headers: Record<string, string> = {}) {
  return new NextRequest("http://localhost/api/admin/dashboard", { headers });
}

function docsFrom(items: unknown[]) {
  return { docs: items.map((data) => ({ data: () => data })) };
}

beforeEach(() => {
  vi.clearAllMocks();
  collection.mockImplementation((path: string) => {
    if (path === "applications") return { get: applicationsGet };
    if (path === "inquiries") return { get: inquiriesGet };
    if (path === "parents") return { get: parentsGet };
    return { get: paymentsGet };
  });
  applicationsGet.mockResolvedValue(docsFrom([]));
  inquiriesGet.mockResolvedValue(docsFrom([]));
  parentsGet.mockResolvedValue({ docs: [] });
  paymentsGet.mockResolvedValue({ docs: [] });
});

afterEach(() => {
  delete process.env.ADMIN_EMAILS;
  delete process.env.ADMIN_EMAILS_DASHBOARD;
});

describe("GET /api/admin/dashboard", () => {
  it("rejects requests without an Authorization header", async () => {
    const { GET } = await import("@/app/api/admin/dashboard/route");
    const res = await GET(request());
    expect(res.status).toBe(401);
  });

  it("rejects an invalid token", async () => {
    verifyIdToken.mockRejectedValue(new Error("bad token"));
    const { GET } = await import("@/app/api/admin/dashboard/route");
    const res = await GET(request({ authorization: "Bearer bad" }));
    expect(res.status).toBe(401);
  });

  it("403s when the token's email isn't in ADMIN_EMAILS or ADMIN_EMAILS_DASHBOARD", async () => {
    process.env.ADMIN_EMAILS = "staff@earlydays.example";
    verifyIdToken.mockResolvedValue({ email: "parent@example.com" });
    const { GET } = await import("@/app/api/admin/dashboard/route");
    const res = await GET(request({ authorization: "Bearer ok" }));
    expect(res.status).toBe(403);
    expect(applicationsGet).not.toHaveBeenCalled();
  });

  it("returns aggregated counts for an allow-listed admin email", async () => {
    process.env.ADMIN_EMAILS = "staff@earlydays.example";
    verifyIdToken.mockResolvedValue({ email: "staff@earlydays.example" });

    applicationsGet.mockResolvedValue(
      docsFrom([{ status: "new" }, { status: "new" }, { status: "accepted" }])
    );
    inquiriesGet.mockResolvedValue(docsFrom([{ status: "new" }, { status: "resolved" }]));
    parentsGet.mockResolvedValue({
      docs: [
        {
          id: "u1",
          data: () => ({
            guardianName: "Aisha",
            email: "a@b.com",
            children: [
              { id: "c1", name: "Kid One", stage: "N1" },
              { id: "c2", name: "Kid Two", stage: "P1" },
            ],
          }),
        },
      ],
    });
    paymentsGet.mockResolvedValue({
      docs: [
        { data: () => ({ childId: "c1", term: CURRENT_TERM, status: "success", amountKobo: 60_000_00 }) },
      ],
    });

    const { GET } = await import("@/app/api/admin/dashboard/route");
    const res = await GET(request({ authorization: "Bearer ok" }));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toEqual({
      term: CURRENT_TERM,
      applicationCounts: { new: 2, reviewing: 0, accepted: 1, waitlisted: 0, declined: 0 },
      newInquiries: 1,
      fees: {
        childrenPaid: 1,
        childrenUnpaid: 1,
        amountCollectedKobo: 60_000_00,
        amountExpectedKobo: 135_000_00,
      },
    });
  });

  it("returns 200 for an email allow-listed only for the dashboard area", async () => {
    process.env.ADMIN_EMAILS_DASHBOARD = "headoffice@earlydays.example";
    verifyIdToken.mockResolvedValue({ email: "headoffice@earlydays.example" });

    const { GET } = await import("@/app/api/admin/dashboard/route");
    const res = await GET(request({ authorization: "Bearer ok" }));

    expect(res.status).toBe(200);
  });
});
