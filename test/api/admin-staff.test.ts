import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const verifyIdToken = vi.fn();
const collection = vi.fn();
const orderBy = vi.fn();
const get = vi.fn();
const doc = vi.fn();
const set = vi.fn();
const file = vi.fn();
const save = vi.fn();
const deleteFile = vi.fn();
let docCalls = 0;

vi.mock("@/lib/firebase/admin", () => ({
  getAdminAuth: () => ({ verifyIdToken }),
  getAdminDb: () => ({ collection }),
  getAdminBucket: () => ({ file, name: "test-bucket" }),
}));

function resetChain() {
  collection.mockImplementation(() => ({ orderBy, doc }));
  orderBy.mockImplementation(() => ({ get }));
  docCalls = 0;
  doc.mockImplementation(() => (docCalls++ === 0 ? { get: () => Promise.resolve({ exists: false }) } : { id: "s1", set }));
  file.mockImplementation(() => ({ save, delete: deleteFile }));
}

function getRequest(headers: Record<string, string> = {}) {
  return new NextRequest("http://localhost/api/admin/staff", { headers });
}

// See test/api/admin-reports.test.ts for why formData() is stubbed directly
// rather than encoding a real multipart body.
type FieldOverrides = {
  name?: string;
  role?: string;
  bio?: string;
  order?: string;
  photo?: { filename: string; type: string; content: string } | null;
};

function postRequest(headers: Record<string, string>, overrides: FieldOverrides = {}) {
  const { photo: photoOverride, ...fieldOverrides } = overrides;
  const fields = {
    name: "Mrs. Grace A.",
    role: "Head of Nursery",
    bio: "Eight years of nursery experience.",
    order: "0",
    ...fieldOverrides,
  };

  const form = new FormData();
  for (const [key, value] of Object.entries(fields)) form.set(key, value);
  if (photoOverride !== null && photoOverride !== undefined) {
    const { filename, type, content } = photoOverride;
    const fileObj = new File([content], filename, { type });
    if (!fileObj.arrayBuffer) {
      fileObj.arrayBuffer = async () => new TextEncoder().encode(content).buffer;
    }
    form.set("photo", fileObj);
  }

  const req = new NextRequest("http://localhost/api/admin/staff", { method: "POST", headers });
  req.formData = async () => form;
  return req;
}

beforeEach(() => {
  vi.clearAllMocks();
  resetChain();
  process.env.ADMIN_EMAILS = "staff@earlydays.example";
  verifyIdToken.mockResolvedValue({ email: "staff@earlydays.example" });
  save.mockResolvedValue(undefined);
  set.mockResolvedValue(undefined);
  deleteFile.mockResolvedValue(undefined);
});

afterEach(() => {
  delete process.env.ADMIN_EMAILS;
  delete process.env.ADMIN_EMAILS_STAFF;
});

describe("GET /api/admin/staff", () => {
  it("rejects requests without an Authorization header", async () => {
    verifyIdToken.mockReset();
    const { GET } = await import("@/app/api/admin/staff/route");
    const res = await GET(getRequest());
    expect(res.status).toBe(401);
  });

  it("403s when the token's email isn't in ADMIN_EMAILS or ADMIN_EMAILS_STAFF", async () => {
    verifyIdToken.mockResolvedValue({ email: "parent@example.com" });
    const { GET } = await import("@/app/api/admin/staff/route");
    const res = await GET(getRequest({ authorization: "Bearer ok" }));
    expect(res.status).toBe(403);
    expect(get).not.toHaveBeenCalled();
  });

  it("returns staff ordered by order for an allow-listed admin email", async () => {
    get.mockResolvedValue({
      docs: [{ data: () => ({ id: "s1", name: "Mrs. Grace A.", role: "Head of Nursery", bio: "Bio", order: 0 }) }],
    });

    const { GET } = await import("@/app/api/admin/staff/route");
    const res = await GET(getRequest({ authorization: "Bearer ok" }));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.staff).toEqual([{ id: "s1", name: "Mrs. Grace A.", role: "Head of Nursery", bio: "Bio", order: 0 }]);
    expect(collection).toHaveBeenCalledWith("staff");
    expect(orderBy).toHaveBeenCalledWith("order", "asc");
  });
});

describe("POST /api/admin/staff", () => {
  it("rejects requests without an Authorization header", async () => {
    verifyIdToken.mockReset();
    const { POST } = await import("@/app/api/admin/staff/route");
    const res = await POST(postRequest({}));
    expect(res.status).toBe(401);
  });

  it("403s when the token's email isn't in ADMIN_EMAILS", async () => {
    verifyIdToken.mockResolvedValue({ email: "parent@example.com" });
    const { POST } = await import("@/app/api/admin/staff/route");
    const res = await POST(postRequest({ authorization: "Bearer ok" }));
    expect(res.status).toBe(403);
    expect(set).not.toHaveBeenCalled();
  });

  it("400s when a required field is missing", async () => {
    const { POST } = await import("@/app/api/admin/staff/route");
    const res = await POST(postRequest({ authorization: "Bearer ok" }, { name: "" }));
    expect(res.status).toBe(400);
    expect(set).not.toHaveBeenCalled();
  });

  it("400s when order isn't a whole number", async () => {
    const { POST } = await import("@/app/api/admin/staff/route");
    const res = await POST(postRequest({ authorization: "Bearer ok" }, { order: "1.5" }));
    expect(res.status).toBe(400);
    expect(set).not.toHaveBeenCalled();
  });

  it("400s when the photo isn't an accepted image type", async () => {
    const { POST } = await import("@/app/api/admin/staff/route");
    const res = await POST(
      postRequest({ authorization: "Bearer ok" }, { photo: { filename: "x.pdf", type: "application/pdf", content: "x" } })
    );
    expect(res.status).toBe(400);
    expect(save).not.toHaveBeenCalled();
  });

  it("400s when the photo is too large", async () => {
    const { POST } = await import("@/app/api/admin/staff/route");
    const res = await POST(
      postRequest(
        { authorization: "Bearer ok" },
        { photo: { filename: "x.jpg", type: "image/jpeg", content: "x".repeat(5 * 1024 * 1024 + 1) } }
      )
    );
    expect(res.status).toBe(400);
    expect(save).not.toHaveBeenCalled();
  });

  it("creates a staff member without a photo", async () => {
    const { POST } = await import("@/app/api/admin/staff/route");
    const res = await POST(postRequest({ authorization: "Bearer ok" }));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(save).not.toHaveBeenCalled();
    expect(set).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "s1",
        name: "Mrs. Grace A.",
        role: "Head of Nursery",
        bio: "Eight years of nursery experience.",
        order: 0,
        createdBy: "staff@earlydays.example",
      })
    );
    expect(json.photoUrl).toBeUndefined();
  });

  it("uploads a photo to Storage and stores a public photoUrl", async () => {
    const { POST } = await import("@/app/api/admin/staff/route");
    const res = await POST(
      postRequest({ authorization: "Bearer ok" }, { photo: { filename: "x.jpg", type: "image/jpeg", content: "img" } })
    );
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(file).toHaveBeenCalledWith(expect.stringMatching(/^staff\/s1\/s1-\d+\.jpg$/));
    expect(save).toHaveBeenCalledWith(expect.any(Buffer), { contentType: "image/jpeg" });
    expect(json.photoUrl).toContain("https://firebasestorage.googleapis.com/v0/b/test-bucket/o/staff%2Fs1%2F");
    expect(json.photoStoragePath).toMatch(/^staff\/s1\/s1-\d+\.jpg$/);
  });

  it("cleans up the uploaded photo when saving the staff doc fails", async () => {
    set.mockRejectedValue(new Error("Firestore is down"));
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const { POST } = await import("@/app/api/admin/staff/route");
    const res = await POST(
      postRequest({ authorization: "Bearer ok" }, { photo: { filename: "x.jpg", type: "image/jpeg", content: "img" } })
    );

    expect(res.status).toBe(500);
    expect(deleteFile).toHaveBeenCalled();

    consoleSpy.mockRestore();
  });
});
