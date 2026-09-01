import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const verifyIdToken = vi.fn();
const collection = vi.fn();
const doc = vi.fn();
const get = vi.fn();
const update = vi.fn();
const where = vi.fn();
const limit = vi.fn();
const uniquenessGet = vi.fn();
const file = vi.fn();
const save = vi.fn();
const deleteFile = vi.fn();

vi.mock("@/lib/firebase/admin", () => ({
  getAdminAuth: () => ({ verifyIdToken }),
  getAdminDb: () => ({ collection }),
  getAdminBucket: () => ({ file, name: "test-bucket" }),
}));

const existingPost = {
  id: "p1",
  slug: "helping-a-shy-child",
  category: "Settling In",
  title: "Helping a shy child through the first week",
  excerpt: "Small routines that make drop-off easier for both of you.",
  body: ["Paragraph one."],
  gradient: "linear-gradient(135deg,#232532,#292b31)",
  order: 0,
  createdBy: "staff@earlydays.example",
  createdAt: 1,
};

function resetChain() {
  collection.mockImplementation(() => ({ doc, where }));
  doc.mockImplementation(() => ({ get, update }));
  where.mockImplementation(() => ({ limit }));
  limit.mockImplementation(() => ({ get: uniquenessGet }));
  file.mockImplementation(() => ({ save, delete: deleteFile }));
}

type FieldOverrides = {
  slug?: string;
  category?: string;
  title?: string;
  excerpt?: string;
  body?: string;
  order?: string;
  removePhoto?: string;
  photo?: { filename: string; type: string; content: string } | null;
};

function request(headers: Record<string, string>, overrides: FieldOverrides = {}) {
  const { photo: photoOverride, ...fieldOverrides } = overrides;
  const form = new FormData();
  for (const [key, value] of Object.entries(fieldOverrides)) form.set(key, value);
  if (photoOverride) {
    const { filename, type, content } = photoOverride;
    const fileObj = new File([content], filename, { type });
    if (!fileObj.arrayBuffer) {
      fileObj.arrayBuffer = async () => new TextEncoder().encode(content).buffer;
    }
    form.set("photo", fileObj);
  }

  const req = new NextRequest("http://localhost/api/admin/blog/p1", { method: "PATCH", headers });
  req.formData = async () => form;
  return req;
}

function context(id = "p1") {
  return { params: { id } };
}

beforeEach(() => {
  vi.clearAllMocks();
  resetChain();
  process.env.ADMIN_EMAILS = "staff@earlydays.example";
  verifyIdToken.mockResolvedValue({ email: "staff@earlydays.example" });
  get.mockResolvedValue({ exists: true, data: () => existingPost });
  uniquenessGet.mockResolvedValue({ empty: true });
  update.mockResolvedValue(undefined);
  save.mockResolvedValue(undefined);
  deleteFile.mockResolvedValue(undefined);
});

afterEach(() => {
  delete process.env.ADMIN_EMAILS;
  delete process.env.ADMIN_EMAILS_BLOG;
});

describe("PATCH /api/admin/blog/[id]", () => {
  it("rejects requests without an Authorization header", async () => {
    verifyIdToken.mockReset();
    const { PATCH } = await import("@/app/api/admin/blog/[id]/route");
    const res = await PATCH(request({}, { title: "New Title" }), context());
    expect(res.status).toBe(401);
  });

  it("403s when the token's email isn't authorized", async () => {
    verifyIdToken.mockResolvedValue({ email: "parent@example.com" });
    const { PATCH } = await import("@/app/api/admin/blog/[id]/route");
    const res = await PATCH(request({ authorization: "Bearer ok" }, { title: "New Title" }), context());
    expect(res.status).toBe(403);
    expect(update).not.toHaveBeenCalled();
  });

  it("404s when the post doesn't exist", async () => {
    get.mockResolvedValue({ exists: false });
    const { PATCH } = await import("@/app/api/admin/blog/[id]/route");
    const res = await PATCH(request({ authorization: "Bearer ok" }, { title: "New Title" }), context());
    expect(res.status).toBe(404);
  });

  it("400s on an invalid order", async () => {
    const { PATCH } = await import("@/app/api/admin/blog/[id]/route");
    const res = await PATCH(request({ authorization: "Bearer ok" }, { order: "not-a-number" }), context());
    expect(res.status).toBe(400);
    expect(update).not.toHaveBeenCalled();
  });

  it("400s on an invalid slug", async () => {
    const { PATCH } = await import("@/app/api/admin/blog/[id]/route");
    const res = await PATCH(request({ authorization: "Bearer ok" }, { slug: "Not A Slug!" }), context());
    expect(res.status).toBe(400);
    expect(update).not.toHaveBeenCalled();
  });

  it("400s when changing to a slug that's already taken", async () => {
    uniquenessGet.mockResolvedValue({ empty: false });
    const { PATCH } = await import("@/app/api/admin/blog/[id]/route");
    const res = await PATCH(request({ authorization: "Bearer ok" }, { slug: "another-post" }), context());
    expect(res.status).toBe(400);
    expect(update).not.toHaveBeenCalled();
  });

  it("allows keeping the same slug without a uniqueness check clash", async () => {
    uniquenessGet.mockResolvedValue({ empty: false });
    const { PATCH } = await import("@/app/api/admin/blog/[id]/route");
    const res = await PATCH(request({ authorization: "Bearer ok" }, { slug: "helping-a-shy-child" }), context());
    expect(res.status).toBe(200);
    expect(update).toHaveBeenCalled();
  });

  it("updates text fields, splits the body into paragraphs, and returns the merged post", async () => {
    const { PATCH } = await import("@/app/api/admin/blog/[id]/route");
    const res = await PATCH(
      request({ authorization: "Bearer ok" }, { title: "New Title", body: "Para A.\n\nPara B." }),
      context()
    );
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ title: "New Title", body: ["Para A.", "Para B."] }));
    expect(json).toMatchObject({ id: "p1", title: "New Title" });
  });

  it("uploads a new cover photo and deletes the old one after a successful update", async () => {
    const withOldPhoto = { ...existingPost, coverPhotoUrl: "https://old", coverPhotoStoragePath: "blog/p1/old.jpg" };
    get.mockResolvedValue({ exists: true, data: () => withOldPhoto });

    const { PATCH } = await import("@/app/api/admin/blog/[id]/route");
    const res = await PATCH(
      request({ authorization: "Bearer ok" }, { photo: { filename: "new.jpg", type: "image/jpeg", content: "img" } }),
      context()
    );
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(save).toHaveBeenCalledWith(expect.any(Buffer), { contentType: "image/jpeg" });
    expect(json.coverPhotoUrl).toContain("https://firebasestorage.googleapis.com");
    expect(file).toHaveBeenCalledWith("blog/p1/old.jpg");
    expect(deleteFile).toHaveBeenCalled();
  });

  it("removes the cover photo when removePhoto is set", async () => {
    const withOldPhoto = { ...existingPost, coverPhotoUrl: "https://old", coverPhotoStoragePath: "blog/p1/old.jpg" };
    get.mockResolvedValue({ exists: true, data: () => withOldPhoto });

    const { PATCH } = await import("@/app/api/admin/blog/[id]/route");
    const res = await PATCH(request({ authorization: "Bearer ok" }, { removePhoto: "true" }), context());
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(file).toHaveBeenCalledWith("blog/p1/old.jpg");
    expect(deleteFile).toHaveBeenCalled();
    expect(json.coverPhotoUrl).toBeUndefined();
    expect(json.coverPhotoStoragePath).toBeUndefined();
  });

  it("cleans up the newly uploaded photo when the update fails", async () => {
    update.mockRejectedValue(new Error("Firestore is down"));
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const { PATCH } = await import("@/app/api/admin/blog/[id]/route");
    const res = await PATCH(
      request({ authorization: "Bearer ok" }, { photo: { filename: "new.jpg", type: "image/jpeg", content: "img" } }),
      context()
    );

    expect(res.status).toBe(500);
    expect(deleteFile).toHaveBeenCalled();

    consoleSpy.mockRestore();
  });
});
