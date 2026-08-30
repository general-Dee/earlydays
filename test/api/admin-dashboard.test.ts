import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const TEST_TERM = "Term 2";

const verifyIdToken = vi.fn();
const collection = vi.fn();
const applicationsGet = vi.fn();
const inquiriesGet = vi.fn();
const parentsGet = vi.fn();
const paymentsGet = vi.fn();
const termGet = vi.fn();
const termSet = vi.fn();
const feesGet = vi.fn();
const feesSet = vi.fn();

vi.mock("@/lib/firebase/admin", () => ({
  getAdminAuth: () => ({ verifyIdToken }),
  getAdminDb: () => ({ collection }),
}));

function request(headers: Record<string, string> = {}) {
  return new NextRequest("http://localhost/api/admin/dashboard", { headers });
}

function patchRequest(body: unknown, headers: Record<string, string> = {}) {
  return new NextRequest("http://localhost/api/admin/dashboard", {
    method: "PATCH",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
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
    if (path === "settings") {
      return {
        doc: (id: string) => (id === "term" ? { get: termGet, set: termSet } : { get: feesGet, set: feesSet }),
      };
    }
    return { get: paymentsGet };
  });
  applicationsGet.mockResolvedValue(docsFrom([]));
  inquiriesGet.mockResolvedValue(docsFrom([]));
  parentsGet.mockResolvedValue({ docs: [] });
  paymentsGet.mockResolvedValue({ docs: [] });
  termGet.mockResolvedValue({ exists: true, data: () => ({ currentTerm: TEST_TERM }) });
  termSet.mockResolvedValue(undefined);
  feesGet.mockResolvedValue({ exists: false });
  feesSet.mockResolvedValue(undefined);
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
        { data: () => ({ childId: "c1", term: TEST_TERM, status: "success", amountKobo: 60_000_00 }) },
      ],
    });

    const { GET } = await import("@/app/api/admin/dashboard/route");
    const res = await GET(request({ authorization: "Bearer ok" }));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toEqual({
      term: TEST_TERM,
      applicationCounts: { new: 2, reviewing: 0, accepted: 1, waitlisted: 0, declined: 0 },
      newInquiries: 1,
      fees: {
        childrenPaid: 1,
        childrenUnpaid: 1,
        amountCollectedKobo: 60_000_00,
        amountExpectedKobo: 135_000_00,
      },
      feeAmounts: {
        creche: 45_000_00,
        "pre-nursery": 50_000_00,
        nursery: 60_000_00,
        "primary-junior": 75_000_00,
        "primary-senior": 85_000_00,
      },
      termBreakdown: [
        { term: "Term 1", amountCollectedKobo: 0, amountExpectedKobo: 135_000_00 },
        { term: "Term 2", amountCollectedKobo: 60_000_00, amountExpectedKobo: 135_000_00 },
        { term: "Term 3", amountCollectedKobo: 0, amountExpectedKobo: 135_000_00 },
      ],
    });
  });

  it("buckets successful payments into termBreakdown by their term field", async () => {
    process.env.ADMIN_EMAILS = "staff@earlydays.example";
    verifyIdToken.mockResolvedValue({ email: "staff@earlydays.example" });

    parentsGet.mockResolvedValue({
      docs: [
        {
          id: "u1",
          data: () => ({
            guardianName: "Aisha",
            email: "a@b.com",
            children: [{ id: "c1", name: "Kid One", stage: "N1" }],
          }),
        },
      ],
    });
    paymentsGet.mockResolvedValue({
      docs: [
        { data: () => ({ childId: "c1", term: "Term 1", status: "success", amountKobo: 60_000_00 }) },
        { data: () => ({ childId: "c1", term: "Term 2", status: "success", amountKobo: 60_000_00 }) },
      ],
    });

    const { GET } = await import("@/app/api/admin/dashboard/route");
    const res = await GET(request({ authorization: "Bearer ok" }));
    const json = await res.json();

    expect(json.termBreakdown).toEqual([
      { term: "Term 1", amountCollectedKobo: 60_000_00, amountExpectedKobo: 60_000_00 },
      { term: "Term 2", amountCollectedKobo: 60_000_00, amountExpectedKobo: 60_000_00 },
      { term: "Term 3", amountCollectedKobo: 0, amountExpectedKobo: 60_000_00 },
    ]);
  });

  it("excludes non-success payments from termBreakdown collected totals", async () => {
    process.env.ADMIN_EMAILS = "staff@earlydays.example";
    verifyIdToken.mockResolvedValue({ email: "staff@earlydays.example" });

    parentsGet.mockResolvedValue({
      docs: [
        {
          id: "u1",
          data: () => ({
            guardianName: "Aisha",
            email: "a@b.com",
            children: [{ id: "c1", name: "Kid One", stage: "N1" }],
          }),
        },
      ],
    });
    paymentsGet.mockResolvedValue({
      docs: [{ data: () => ({ childId: "c1", term: "Term 1", status: "pending", amountKobo: 60_000_00 }) }],
    });

    const { GET } = await import("@/app/api/admin/dashboard/route");
    const res = await GET(request({ authorization: "Bearer ok" }));
    const json = await res.json();

    expect(json.termBreakdown[0]).toEqual({ term: "Term 1", amountCollectedKobo: 0, amountExpectedKobo: 60_000_00 });
  });

  it("returns zero-valued termBreakdown entries when there are no parents", async () => {
    process.env.ADMIN_EMAILS = "staff@earlydays.example";
    verifyIdToken.mockResolvedValue({ email: "staff@earlydays.example" });

    const { GET } = await import("@/app/api/admin/dashboard/route");
    const res = await GET(request({ authorization: "Bearer ok" }));
    const json = await res.json();

    expect(json.termBreakdown).toEqual([
      { term: "Term 1", amountCollectedKobo: 0, amountExpectedKobo: 0 },
      { term: "Term 2", amountCollectedKobo: 0, amountExpectedKobo: 0 },
      { term: "Term 3", amountCollectedKobo: 0, amountExpectedKobo: 0 },
    ]);
  });

  it("returns 200 for an email allow-listed only for the dashboard area", async () => {
    process.env.ADMIN_EMAILS_DASHBOARD = "headoffice@earlydays.example";
    verifyIdToken.mockResolvedValue({ email: "headoffice@earlydays.example" });

    const { GET } = await import("@/app/api/admin/dashboard/route");
    const res = await GET(request({ authorization: "Bearer ok" }));

    expect(res.status).toBe(200);
  });
});

describe("PATCH /api/admin/dashboard", () => {
  it("rejects requests without an Authorization header", async () => {
    const { PATCH } = await import("@/app/api/admin/dashboard/route");
    const res = await PATCH(patchRequest({ currentTerm: "Term 1" }));
    expect(res.status).toBe(401);
  });

  it("403s when the token's email isn't authorized", async () => {
    process.env.ADMIN_EMAILS = "staff@earlydays.example";
    verifyIdToken.mockResolvedValue({ email: "parent@example.com" });
    const { PATCH } = await import("@/app/api/admin/dashboard/route");
    const res = await PATCH(patchRequest({ currentTerm: "Term 1" }, { authorization: "Bearer ok" }));
    expect(res.status).toBe(403);
    expect(termSet).not.toHaveBeenCalled();
  });

  it("rejects an unrecognized term", async () => {
    process.env.ADMIN_EMAILS = "staff@earlydays.example";
    verifyIdToken.mockResolvedValue({ email: "staff@earlydays.example" });
    const { PATCH } = await import("@/app/api/admin/dashboard/route");
    const res = await PATCH(patchRequest({ currentTerm: "Not A Term" }, { authorization: "Bearer ok" }));

    expect(res.status).toBe(400);
    expect(termSet).not.toHaveBeenCalled();
  });

  it("updates the current term for a valid value", async () => {
    process.env.ADMIN_EMAILS = "staff@earlydays.example";
    verifyIdToken.mockResolvedValue({ email: "staff@earlydays.example" });
    const { PATCH } = await import("@/app/api/admin/dashboard/route");
    const res = await PATCH(patchRequest({ currentTerm: "Term 1" }, { authorization: "Bearer ok" }));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toEqual({ term: "Term 1" });
    expect(termSet).toHaveBeenCalledWith(
      expect.objectContaining({ currentTerm: "Term 1", updatedBy: "staff@earlydays.example" }),
      { merge: true }
    );
  });

  it("rejects a body with neither currentTerm nor feesKobo", async () => {
    process.env.ADMIN_EMAILS = "staff@earlydays.example";
    verifyIdToken.mockResolvedValue({ email: "staff@earlydays.example" });
    const { PATCH } = await import("@/app/api/admin/dashboard/route");
    const res = await PATCH(patchRequest({}, { authorization: "Bearer ok" }));

    expect(res.status).toBe(400);
    expect(termSet).not.toHaveBeenCalled();
    expect(feesSet).not.toHaveBeenCalled();
  });

  it("updates the fee schedule for valid bracket amounts", async () => {
    process.env.ADMIN_EMAILS = "staff@earlydays.example";
    verifyIdToken.mockResolvedValue({ email: "staff@earlydays.example" });
    const { PATCH } = await import("@/app/api/admin/dashboard/route");
    const res = await PATCH(
      patchRequest({ feesKobo: { creche: 5_000_00, nursery: 7_000_00 } }, { authorization: "Bearer ok" })
    );
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toEqual({ feeAmounts: { creche: 5_000_00, nursery: 7_000_00 } });
    expect(feesSet).toHaveBeenCalledWith(
      expect.objectContaining({
        amountsKobo: { creche: 5_000_00, nursery: 7_000_00 },
        updatedBy: "staff@earlydays.example",
      }),
      { merge: true }
    );
  });

  it("400s on an unknown fee bracket id", async () => {
    process.env.ADMIN_EMAILS = "staff@earlydays.example";
    verifyIdToken.mockResolvedValue({ email: "staff@earlydays.example" });
    const { PATCH } = await import("@/app/api/admin/dashboard/route");
    const res = await PATCH(patchRequest({ feesKobo: { madeup: 5_000_00 } }, { authorization: "Bearer ok" }));

    expect(res.status).toBe(400);
    expect(feesSet).not.toHaveBeenCalled();
  });

  it("400s on a non-positive fee amount", async () => {
    process.env.ADMIN_EMAILS = "staff@earlydays.example";
    verifyIdToken.mockResolvedValue({ email: "staff@earlydays.example" });
    const { PATCH } = await import("@/app/api/admin/dashboard/route");
    const res = await PATCH(patchRequest({ feesKobo: { creche: 0 } }, { authorization: "Bearer ok" }));

    expect(res.status).toBe(400);
    expect(feesSet).not.toHaveBeenCalled();
  });

  it("updates both the term and fee schedule in one request", async () => {
    process.env.ADMIN_EMAILS = "staff@earlydays.example";
    verifyIdToken.mockResolvedValue({ email: "staff@earlydays.example" });
    const { PATCH } = await import("@/app/api/admin/dashboard/route");
    const res = await PATCH(
      patchRequest({ currentTerm: "Term 1", feesKobo: { creche: 5_000_00 } }, { authorization: "Bearer ok" })
    );
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toEqual({ term: "Term 1", feeAmounts: { creche: 5_000_00 } });
    expect(termSet).toHaveBeenCalled();
    expect(feesSet).toHaveBeenCalled();
  });
});
