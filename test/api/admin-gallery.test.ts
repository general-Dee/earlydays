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

vi.mock("@/lib/firebase/admin", () => ({
  getAdminAuth: () => ({ verifyIdToken }),
  getAdminDb: () => ({ collection }),
  getAdminBucket: () => ({ file, name: "test-bucket" }),
}));

function resetChain() {
  collection.mockImplementation(() => ({ orderBy, doc }));
  orderBy.mockImplementation(() => ({ get }));
  doc.mockImplementation(() => ({ id: "g1", set }));
  file.mockImplementation(() => ({ save, delete: deleteFile }));
}

function getRequest(headers: Record<string, string> = {}) {
  return new NextRequest("http://localhost/api/admin/gallery", { headers });
}

// See test/api/admin-reports.test.ts for why formData() is stubbed directly
// rather than encoding a real multipart body.
type FieldOverrides = {
  alt?: string;
  category?: string;
  tall?: string;
  order?: string;
  photo?: { filename: string; type: string; content: string } | null;
};

function postRequest(headers: Record<string, string>, overrides: FieldOverrides = {}) {
  const { photo: photoOverride, ...fieldOverrides } = overrides;
  const fields = {
    alt: "Sunflower-painted welcome entrance and gate at the Earlydays campus",
    category: "Campus & Grounds",
    order: "0",
    ...fieldOverrides,
  };

  const form = new FormData();
  for (const [key, value] of Object.entries(fields)) form.set(key, value);

  const photoFieldSet = "photo" in overrides;
  if (!photoFieldSet) {
    const fileObj = new File(["img"], "x.jpg", { type: "image/jpeg" });
    if (!fileObj.arrayBuffer) fileObj.arrayBuffer = async () => new TextEncoder().encode("img").buffer;
    form.set("photo", fileObj);
  } else if (photoOverride !== null && photoOverride !== undefined) {
    const { filename, type, content } = photoOverride;
    const fileObj = new File([content], filename, { type });
    if (!fileObj.arrayBuffer) {
      fileObj.arrayBuffer = async () => new TextEncoder().encode(content).buffer;
    }
    form.set("photo", fileObj);
  }

  const req = new NextRequest("http://localhost/api/admin/gallery", { method: "POST", headers });
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
  delete process.env.ADMIN_EMAILS_GALLERY;
});

describe("GET /api/admin/gallery", () => {
  it("rejects requests without an Authorization header", async () => {
    verifyIdToken.mockReset();
    const { GET } = await import("@/app/api/admin/gallery/route");
    const res = await GET(getRequest());
    expect(res.status).toBe(401);
  });

  it("403s when the token's email isn't in ADMIN_EMAILS or ADMIN_EMAILS_GALLERY", async () => {
    verifyIdToken.mockResolvedValue({ email: "parent@example.com" });
    const { GET } = await import("@/app/api/admin/gallery/route");
    const res = await GET(getRequest({ authorization: "Bearer ok" }));
    expect(res.status).toBe(403);
    expect(get).not.toHaveBeenCalled();
  });

  it("returns photos ordered by order for an allow-listed admin email", async () => {
    get.mockResolvedValue({
      docs: [{ data: () => ({ id: "g1", alt: "Photo", category: "Campus & Grounds", order: 0 }) }],
    });

    const { GET } = await import("@/app/api/admin/gallery/route");
    const res = await GET(getRequest({ authorization: "Bearer ok" }));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.photos).toEqual([{ id: "g1", alt: "Photo", category: "Campus & Grounds", order: 0 }]);
    expect(collection).toHaveBeenCalledWith("gallery");
    expect(orderBy).toHaveBeenCalledWith("order", "asc");
  });
});

describe("POST /api/admin/gallery", () => {
  it("rejects requests without an Authorization header", async () => {
    verifyIdToken.mockReset();
    const { POST } = await import("@/app/api/admin/gallery/route");
    const res = await POST(postRequest({}));
    expect(res.status).toBe(401);
  });

  it("403s when the token's email isn't in ADMIN_EMAILS", async () => {
    verifyIdToken.mockResolvedValue({ email: "parent@example.com" });
    const { POST } = await import("@/app/api/admin/gallery/route");
    const res = await POST(postRequest({ authorization: "Bearer ok" }));
    expect(res.status).toBe(403);
    expect(set).not.toHaveBeenCalled();
  });

  it("400s when a required field is missing", async () => {
    const { POST } = await import("@/app/api/admin/gallery/route");
    const res = await POST(postRequest({ authorization: "Bearer ok" }, { alt: "" }));
    expect(res.status).toBe(400);
    expect(set).not.toHaveBeenCalled();
  });

  it("400s when the category isn't one of the fixed values", async () => {
    const { POST } = await import("@/app/api/admin/gallery/route");
    const res = await POST(postRequest({ authorization: "Bearer ok" }, { category: "Not A Category" }));
    expect(res.status).toBe(400);
    expect(set).not.toHaveBeenCalled();
  });

  it("400s when order isn't a whole number", async () => {
    const { POST } = await import("@/app/api/admin/gallery/route");
    const res = await POST(postRequest({ authorization: "Bearer ok" }, { order: "1.5" }));
    expect(res.status).toBe(400);
    expect(set).not.toHaveBeenCalled();
  });

  it("400s when no photo is provided", async () => {
    const { POST } = await import("@/app/api/admin/gallery/route");
    const res = await POST(postRequest({ authorization: "Bearer ok" }, { photo: null }));
    expect(res.status).toBe(400);
    expect(save).not.toHaveBeenCalled();
  });

  it("400s when the photo isn't an accepted image type", async () => {
    const { POST } = await import("@/app/api/admin/gallery/route");
    const res = await POST(
      postRequest({ authorization: "Bearer ok" }, { photo: { filename: "x.pdf", type: "application/pdf", content: "x" } })
    );
    expect(res.status).toBe(400);
    expect(save).not.toHaveBeenCalled();
  });

  it("400s when the photo is too large", async () => {
    const { POST } = await import("@/app/api/admin/gallery/route");
    const res = await POST(
      postRequest(
        { authorization: "Bearer ok" },
        { photo: { filename: "x.jpg", type: "image/jpeg", content: "x".repeat(5 * 1024 * 1024 + 1) } }
      )
    );
    expect(res.status).toBe(400);
    expect(save).not.toHaveBeenCalled();
  });

  it("uploads the photo to Storage and creates the gallery doc", async () => {
    const { POST } = await import("@/app/api/admin/gallery/route");
    const res = await POST(
      postRequest({ authorization: "Bearer ok" }, { photo: { filename: "x.jpg", type: "image/jpeg", content: "img" }, tall: "true" })
    );
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(file).toHaveBeenCalledWith(expect.stringMatching(/^gallery\/g1\/g1-\d+\.jpg$/));
    expect(save).toHaveBeenCalledWith(expect.any(Buffer), { contentType: "image/jpeg" });
    expect(json.photoUrl).toContain("https://firebasestorage.googleapis.com/v0/b/test-bucket/o/gallery%2Fg1%2F");
    expect(json.photoStoragePath).toMatch(/^gallery\/g1\/g1-\d+\.jpg$/);
    expect(json.tall).toBe(true);
    expect(set).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "g1",
        alt: "Sunflower-painted welcome entrance and gate at the Earlydays campus",
        category: "Campus & Grounds",
        order: 0,
        createdBy: "staff@earlydays.example",
      })
    );
  });

  it("cleans up the uploaded photo when saving the gallery doc fails", async () => {
    set.mockRejectedValue(new Error("Firestore is down"));
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const { POST } = await import("@/app/api/admin/gallery/route");
    const res = await POST(
      postRequest({ authorization: "Bearer ok" }, { photo: { filename: "x.jpg", type: "image/jpeg", content: "img" } })
    );

    expect(res.status).toBe(500);
    expect(deleteFile).toHaveBeenCalled();

    consoleSpy.mockRestore();
  });
});
