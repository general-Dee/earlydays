import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const verifyIdToken = vi.fn();
const collection = vi.fn();
const parentsGet = vi.fn();
const paymentsGetByPath: Record<string, ReturnType<typeof vi.fn>> = {};

vi.mock("@/lib/firebase/admin", () => ({
  getAdminAuth: () => ({ verifyIdToken }),
  getAdminDb: () => ({ collection }),
}));

function request(headers: Record<string, string> = {}) {
  return new NextRequest("http://localhost/api/admin/payments", { headers });
}

function docsFrom(items: unknown[]) {
  return { docs: items.map((data) => ({ data: () => data })) };
}

beforeEach(() => {
  vi.clearAllMocks();
  for (const key of Object.keys(paymentsGetByPath)) delete paymentsGetByPath[key];

  collection.mockImplementation((path: string) => {
    if (path === "adminUsers") return { doc: () => ({ get: () => Promise.resolve({ exists: false }) }) };
    if (path === "parents") return { get: parentsGet };
    if (!paymentsGetByPath[path]) {
      paymentsGetByPath[path] = vi.fn().mockResolvedValue(docsFrom([]));
    }
    return { get: paymentsGetByPath[path] };
  });
  parentsGet.mockResolvedValue({ docs: [] });
});

afterEach(() => {
  delete process.env.ADMIN_EMAILS;
  delete process.env.ADMIN_EMAILS_PAYMENTS;
});

describe("GET /api/admin/payments", () => {
  it("rejects requests without an Authorization header", async () => {
    const { GET } = await import("@/app/api/admin/payments/route");
    const res = await GET(request());
    expect(res.status).toBe(401);
  });

  it("403s when the token's email isn't in ADMIN_EMAILS or ADMIN_EMAILS_PAYMENTS", async () => {
    process.env.ADMIN_EMAILS = "staff@earlydays.example";
    verifyIdToken.mockResolvedValue({ email: "parent@example.com" });
    const { GET } = await import("@/app/api/admin/payments/route");
    const res = await GET(request({ authorization: "Bearer ok" }));
    expect(res.status).toBe(403);
    expect(parentsGet).not.toHaveBeenCalled();
  });

  it("returns 200 for an email allow-listed only for the payments area", async () => {
    process.env.ADMIN_EMAILS_PAYMENTS = "headoffice@earlydays.example";
    verifyIdToken.mockResolvedValue({ email: "headoffice@earlydays.example" });

    const { GET } = await import("@/app/api/admin/payments/route");
    const res = await GET(request({ authorization: "Bearer ok" }));

    expect(res.status).toBe(200);
  });

  it("flattens payments across parents, enriched with guardian info, sorted newest first", async () => {
    process.env.ADMIN_EMAILS = "staff@earlydays.example";
    verifyIdToken.mockResolvedValue({ email: "staff@earlydays.example" });

    parentsGet.mockResolvedValue({
      docs: [
        { id: "u1", data: () => ({ guardianName: "Aisha", email: "aisha@example.com", children: [] }) },
        { id: "u2", data: () => ({ guardianName: "Chidi", email: "chidi@example.com", children: [] }) },
      ],
    });

    collection.mockImplementation((path: string) => {
      if (path === "adminUsers") return { doc: () => ({ get: () => Promise.resolve({ exists: false }) }) };
      if (path === "parents") return { get: parentsGet };
      if (path === "parents/u1/payments") {
        return {
          get: vi.fn().mockResolvedValue(
            docsFrom([
              {
                reference: "edy_1",
                childId: "c1",
                childName: "Zainab",
                term: "Term 1",
                amountKobo: 60_000_00,
                status: "success",
                createdAt: 1,
              },
            ])
          ),
        };
      }
      if (path === "parents/u2/payments") {
        return {
          get: vi.fn().mockResolvedValue(
            docsFrom([
              {
                reference: "edy_2",
                childId: "c2",
                childName: "Emeka",
                term: "Term 1",
                amountKobo: 75_000_00,
                status: "pending",
                createdAt: 2,
              },
            ])
          ),
        };
      }
      return { get: vi.fn().mockResolvedValue(docsFrom([])) };
    });

    const { GET } = await import("@/app/api/admin/payments/route");
    const res = await GET(request({ authorization: "Bearer ok" }));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.payments).toEqual([
      {
        reference: "edy_2",
        childId: "c2",
        childName: "Emeka",
        term: "Term 1",
        amountKobo: 75_000_00,
        status: "pending",
        createdAt: 2,
        parentUid: "u2",
        guardianName: "Chidi",
        guardianEmail: "chidi@example.com",
      },
      {
        reference: "edy_1",
        childId: "c1",
        childName: "Zainab",
        term: "Term 1",
        amountKobo: 60_000_00,
        status: "success",
        createdAt: 1,
        parentUid: "u1",
        guardianName: "Aisha",
        guardianEmail: "aisha@example.com",
      },
    ]);
  });
});
