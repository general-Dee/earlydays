import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const verifyIdToken = vi.fn();
const collection = vi.fn();
const orderBy = vi.fn();
const where = vi.fn();
const limit = vi.fn();
const get = vi.fn();
const uniquenessGet = vi.fn();
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
  collection.mockImplementation(() => ({ orderBy, doc, where }));
  orderBy.mockImplementation(() => ({ get }));
  where.mockImplementation(() => ({ limit }));
  limit.mockImplementation(() => ({ get: uniquenessGet }));
  docCalls = 0;
  doc.mockImplementation(() => (docCalls++ === 0 ? { get: () => Promise.resolve({ exists: false }) } : { id: "p1", set }));
  file.mockImplementation(() => ({ save, delete: deleteFile }));
}

function getRequest(headers: Record<string, string> = {}) {
  return new NextRequest("http://localhost/api/admin/blog", { headers });
}

// See test/api/admin-reports.test.ts for why formData() is stubbed directly
// rather than encoding a real multipart body.
type FieldOverrides = {
  slug?: string;
  category?: string;
  title?: string;
  excerpt?: string;
  body?: string;
  order?: string;
  photo?: { filename: string; type: string; content: string } | null;
};

function postRequest(headers: Record<string, string>, overrides: FieldOverrides = {}) {
  const { photo: photoOverride, ...fieldOverrides } = overrides;
  const fields = {
    slug: "helping-a-shy-child",
    category: "Settling In",
    title: "Helping a shy child through the first week",
    excerpt: "Small routines that make drop-off easier for both of you.",
    body: "Paragraph one.\n\nParagraph two.",
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

  const req = new NextRequest("http://localhost/api/admin/blog", { method: "POST", headers });
  req.formData = async () => form;
  return req;
}

beforeEach(() => {
  vi.clearAllMocks();
  resetChain();
  process.env.ADMIN_EMAILS = "staff@earlydays.example";
  verifyIdToken.mockResolvedValue({ email: "staff@earlydays.example" });
  uniquenessGet.mockResolvedValue({ empty: true });
  save.mockResolvedValue(undefined);
  set.mockResolvedValue(undefined);
  deleteFile.mockResolvedValue(undefined);
});

afterEach(() => {
  delete process.env.ADMIN_EMAILS;
  delete process.env.ADMIN_EMAILS_BLOG;
});

describe("GET /api/admin/blog", () => {
  it("rejects requests without an Authorization header", async () => {
    verifyIdToken.mockReset();
    const { GET } = await import("@/app/api/admin/blog/route");
    const res = await GET(getRequest());
    expect(res.status).toBe(401);
  });

  it("403s when the token's email isn't in ADMIN_EMAILS or ADMIN_EMAILS_BLOG", async () => {
    verifyIdToken.mockResolvedValue({ email: "parent@example.com" });
    const { GET } = await import("@/app/api/admin/blog/route");
    const res = await GET(getRequest({ authorization: "Bearer ok" }));
    expect(res.status).toBe(403);
    expect(get).not.toHaveBeenCalled();
  });

  it("returns posts ordered by order for an allow-listed admin email", async () => {
    get.mockResolvedValue({
      docs: [{ data: () => ({ id: "p1", slug: "helping-a-shy-child", title: "Title", order: 0 }) }],
    });

    const { GET } = await import("@/app/api/admin/blog/route");
    const res = await GET(getRequest({ authorization: "Bearer ok" }));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.posts).toEqual([{ id: "p1", slug: "helping-a-shy-child", title: "Title", order: 0 }]);
    expect(collection).toHaveBeenCalledWith("blog");
    expect(orderBy).toHaveBeenCalledWith("order", "asc");
  });
});

describe("POST /api/admin/blog", () => {
  it("rejects requests without an Authorization header", async () => {
    verifyIdToken.mockReset();
    const { POST } = await import("@/app/api/admin/blog/route");
    const res = await POST(postRequest({}));
    expect(res.status).toBe(401);
  });

  it("403s when the token's email isn't in ADMIN_EMAILS", async () => {
    verifyIdToken.mockResolvedValue({ email: "parent@example.com" });
    const { POST } = await import("@/app/api/admin/blog/route");
    const res = await POST(postRequest({ authorization: "Bearer ok" }));
    expect(res.status).toBe(403);
    expect(set).not.toHaveBeenCalled();
  });

  it("400s when a required field is missing", async () => {
    const { POST } = await import("@/app/api/admin/blog/route");
    const res = await POST(postRequest({ authorization: "Bearer ok" }, { title: "" }));
    expect(res.status).toBe(400);
    expect(set).not.toHaveBeenCalled();
  });

  it("400s when the slug isn't lowercase kebab-case", async () => {
    const { POST } = await import("@/app/api/admin/blog/route");
    const res = await POST(postRequest({ authorization: "Bearer ok" }, { slug: "Not A Slug!" }));
    expect(res.status).toBe(400);
    expect(set).not.toHaveBeenCalled();
  });

  it("400s when order isn't a whole number", async () => {
    const { POST } = await import("@/app/api/admin/blog/route");
    const res = await POST(postRequest({ authorization: "Bearer ok" }, { order: "1.5" }));
    expect(res.status).toBe(400);
    expect(set).not.toHaveBeenCalled();
  });

  it("400s when a post with the same slug already exists", async () => {
    uniquenessGet.mockResolvedValue({ empty: false });
    const { POST } = await import("@/app/api/admin/blog/route");
    const res = await POST(postRequest({ authorization: "Bearer ok" }));
    expect(res.status).toBe(400);
    expect(set).not.toHaveBeenCalled();
  });

  it("400s when the photo isn't an accepted image type", async () => {
    const { POST } = await import("@/app/api/admin/blog/route");
    const res = await POST(
      postRequest({ authorization: "Bearer ok" }, { photo: { filename: "x.pdf", type: "application/pdf", content: "x" } })
    );
    expect(res.status).toBe(400);
    expect(save).not.toHaveBeenCalled();
  });

  it("400s when the photo is too large", async () => {
    const { POST } = await import("@/app/api/admin/blog/route");
    const res = await POST(
      postRequest(
        { authorization: "Bearer ok" },
        { photo: { filename: "x.jpg", type: "image/jpeg", content: "x".repeat(5 * 1024 * 1024 + 1) } }
      )
    );
    expect(res.status).toBe(400);
    expect(save).not.toHaveBeenCalled();
  });

  it("creates a post without a photo, splitting the body into paragraphs", async () => {
    const { POST } = await import("@/app/api/admin/blog/route");
    const res = await POST(postRequest({ authorization: "Bearer ok" }));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(save).not.toHaveBeenCalled();
    expect(set).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "p1",
        slug: "helping-a-shy-child",
        category: "Settling In",
        title: "Helping a shy child through the first week",
        body: ["Paragraph one.", "Paragraph two."],
        order: 0,
        createdBy: "staff@earlydays.example",
      })
    );
    expect(json.coverPhotoUrl).toBeUndefined();
  });

  it("uploads a cover photo to Storage and stores a public coverPhotoUrl", async () => {
    const { POST } = await import("@/app/api/admin/blog/route");
    const res = await POST(
      postRequest({ authorization: "Bearer ok" }, { photo: { filename: "x.jpg", type: "image/jpeg", content: "img" } })
    );
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(file).toHaveBeenCalledWith(expect.stringMatching(/^blog\/p1\/p1-\d+\.jpg$/));
    expect(save).toHaveBeenCalledWith(expect.any(Buffer), { contentType: "image/jpeg" });
    expect(json.coverPhotoUrl).toContain("https://firebasestorage.googleapis.com/v0/b/test-bucket/o/blog%2Fp1%2F");
    expect(json.coverPhotoStoragePath).toMatch(/^blog\/p1\/p1-\d+\.jpg$/);
  });

  it("cleans up the uploaded photo when saving the post doc fails", async () => {
    set.mockRejectedValue(new Error("Firestore is down"));
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const { POST } = await import("@/app/api/admin/blog/route");
    const res = await POST(
      postRequest({ authorization: "Bearer ok" }, { photo: { filename: "x.jpg", type: "image/jpeg", content: "img" } })
    );

    expect(res.status).toBe(500);
    expect(deleteFile).toHaveBeenCalled();

    consoleSpy.mockRestore();
  });
});
