import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const verifyIdToken = vi.fn();
const collection = vi.fn();
const orderBy = vi.fn();
const get = vi.fn();
const doc = vi.fn();
const docGet = vi.fn();
const set = vi.fn();
const file = vi.fn();
const save = vi.fn();
const deleteFile = vi.fn();

vi.mock("@/lib/firebase/admin", () => ({
  getAdminAuth: () => ({ verifyIdToken }),
  getAdminDb: () => ({ collection }),
  getAdminBucket: () => ({ file }),
}));

function resetChain() {
  collection.mockImplementation(() => ({ orderBy, doc }));
  orderBy.mockImplementation(() => ({ get }));
  doc.mockImplementation(() => ({ get: docGet, collection: () => ({ doc: () => ({ id: "r1", set }) }) }));
  file.mockImplementation(() => ({ save, delete: deleteFile }));
}

function getRequest(headers: Record<string, string> = {}) {
  return new NextRequest("http://localhost/api/admin/reports", { headers });
}

// NextRequest.formData() parses a real wire-format multipart body via
// undici, which either hangs or throws on a body built from vitest's jsdom
// FormData/File polyfills. Since the route only ever calls form.get(...),
// it's simplest and most robust to stub formData() to resolve a FormData
// directly rather than encode/decode a real multipart payload.
type FieldOverrides = {
  parentUid?: string;
  childId?: string;
  childName?: string;
  term?: string;
  file?: { filename: string; type: string; content: string } | null;
};

function postRequest(headers: Record<string, string>, overrides: FieldOverrides = {}) {
  const { file: fileOverride, ...fieldOverrides } = overrides;
  const fields = {
    parentUid: "u1",
    childId: "c1",
    childName: "Zainab",
    term: "Term 3",
    ...fieldOverrides,
  };

  const form = new FormData();
  for (const [key, value] of Object.entries(fields)) form.set(key, value);
  if (fileOverride !== null) {
    const { filename, type, content } = { filename: "report.pdf", type: "application/pdf", content: "%PDF-1.4", ...fileOverride };
    const fileObj = new File([content], filename, { type });
    // jsdom's File doesn't implement Blob.arrayBuffer(); the route calls it.
    if (!fileObj.arrayBuffer) {
      fileObj.arrayBuffer = async () => new TextEncoder().encode(content).buffer;
    }
    form.set("file", fileObj);
  }

  const req = new NextRequest("http://localhost/api/admin/reports", { method: "POST", headers });
  req.formData = async () => form;
  return req;
}

beforeEach(() => {
  vi.clearAllMocks();
  resetChain();
  process.env.ADMIN_EMAILS = "staff@earlydays.example";
  verifyIdToken.mockResolvedValue({ email: "staff@earlydays.example" });
  docGet.mockResolvedValue({ exists: true });
  save.mockResolvedValue(undefined);
  set.mockResolvedValue(undefined);
  deleteFile.mockResolvedValue(undefined);
});

afterEach(() => {
  delete process.env.ADMIN_EMAILS;
  delete process.env.ADMIN_EMAILS_REPORTS;
});

describe("GET /api/admin/reports", () => {
  it("rejects requests without an Authorization header", async () => {
    verifyIdToken.mockReset();
    const { GET } = await import("@/app/api/admin/reports/route");
    const res = await GET(getRequest());
    expect(res.status).toBe(401);
  });

  it("403s when the token's email isn't in ADMIN_EMAILS", async () => {
    verifyIdToken.mockResolvedValue({ email: "parent@example.com" });
    const { GET } = await import("@/app/api/admin/reports/route");
    const res = await GET(getRequest({ authorization: "Bearer ok" }));
    expect(res.status).toBe(403);
    expect(get).not.toHaveBeenCalled();
  });

  it("returns parents ordered by guardian name for an allow-listed admin email", async () => {
    get.mockResolvedValue({
      docs: [
        {
          id: "u1",
          data: () => ({ guardianName: "Aisha Bello", email: "aisha@example.com", children: [{ id: "c1", name: "Zainab", stage: "N1" }] }),
        },
      ],
    });

    const { GET } = await import("@/app/api/admin/reports/route");
    const res = await GET(getRequest({ authorization: "Bearer ok" }));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.parents).toEqual([
      { uid: "u1", guardianName: "Aisha Bello", email: "aisha@example.com", children: [{ id: "c1", name: "Zainab", stage: "N1" }] },
    ]);
    expect(collection).toHaveBeenCalledWith("parents");
    expect(orderBy).toHaveBeenCalledWith("guardianName", "asc");
  });
});

describe("POST /api/admin/reports", () => {
  it("rejects requests without an Authorization header", async () => {
    verifyIdToken.mockReset();
    const { POST } = await import("@/app/api/admin/reports/route");
    const res = await POST(postRequest({}));
    expect(res.status).toBe(401);
  });

  it("403s when the token's email isn't in ADMIN_EMAILS", async () => {
    verifyIdToken.mockResolvedValue({ email: "parent@example.com" });
    const { POST } = await import("@/app/api/admin/reports/route");
    const res = await POST(postRequest({ authorization: "Bearer ok" }));
    expect(res.status).toBe(403);
    expect(save).not.toHaveBeenCalled();
  });

  it("400s when a required field is missing", async () => {
    const { POST } = await import("@/app/api/admin/reports/route");
    const res = await POST(postRequest({ authorization: "Bearer ok" }, { term: "" }));
    expect(res.status).toBe(400);
    expect(save).not.toHaveBeenCalled();
  });

  it("400s when the term is too long", async () => {
    const { POST } = await import("@/app/api/admin/reports/route");
    const res = await POST(postRequest({ authorization: "Bearer ok" }, { term: "x".repeat(61) }));
    expect(res.status).toBe(400);
    expect(save).not.toHaveBeenCalled();
  });

  it("400s when the file isn't a PDF", async () => {
    const { POST } = await import("@/app/api/admin/reports/route");
    const res = await POST(
      postRequest({ authorization: "Bearer ok" }, { file: { filename: "report.txt", type: "text/plain", content: "hi" } })
    );
    expect(res.status).toBe(400);
    expect(save).not.toHaveBeenCalled();
  });

  it("400s when the file is too large", async () => {
    const { POST } = await import("@/app/api/admin/reports/route");
    const res = await POST(
      postRequest(
        { authorization: "Bearer ok" },
        { file: { filename: "report.pdf", type: "application/pdf", content: "x".repeat(10 * 1024 * 1024 + 1) } }
      )
    );
    expect(res.status).toBe(400);
    expect(save).not.toHaveBeenCalled();
  });

  it("404s when the parent doesn't exist", async () => {
    docGet.mockResolvedValue({ exists: false });
    const { POST } = await import("@/app/api/admin/reports/route");
    const res = await POST(postRequest({ authorization: "Bearer ok" }));
    expect(res.status).toBe(404);
    expect(save).not.toHaveBeenCalled();
  });

  it("uploads the PDF to Storage and writes the report doc on success", async () => {
    const { POST } = await import("@/app/api/admin/reports/route");
    const res = await POST(postRequest({ authorization: "Bearer ok" }));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(file).toHaveBeenCalledWith("reports/u1/r1.pdf");
    expect(save).toHaveBeenCalledWith(expect.any(Buffer), { contentType: "application/pdf" });
    expect(set).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "r1",
        childId: "c1",
        childName: "Zainab",
        term: "Term 3",
        fileName: "report.pdf",
        storagePath: "reports/u1/r1.pdf",
        uploadedBy: "staff@earlydays.example",
      })
    );
    expect(json).toMatchObject({ id: "r1", storagePath: "reports/u1/r1.pdf" });
  });

  it("cleans up the uploaded file when saving the report doc fails", async () => {
    set.mockRejectedValue(new Error("Firestore is down"));
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const { POST } = await import("@/app/api/admin/reports/route");
    const res = await POST(postRequest({ authorization: "Bearer ok" }));

    expect(res.status).toBe(500);
    expect(file).toHaveBeenCalledWith("reports/u1/r1.pdf");
    expect(deleteFile).toHaveBeenCalled();

    consoleSpy.mockRestore();
  });

  it("still returns 500 without throwing when the cleanup delete also fails", async () => {
    set.mockRejectedValue(new Error("Firestore is down"));
    deleteFile.mockRejectedValue(new Error("Storage is down"));
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const { POST } = await import("@/app/api/admin/reports/route");
    const res = await POST(postRequest({ authorization: "Bearer ok" }));
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json).toEqual({ error: "Couldn't save the report. Please try again." });

    consoleSpy.mockRestore();
  });
});
