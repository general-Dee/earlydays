import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const verifyIdToken = vi.fn();
const collection = vi.fn();
const doc = vi.fn();
const get = vi.fn();
const update = vi.fn();
const file = vi.fn();
const save = vi.fn();
const deleteFile = vi.fn();
let docCalls = 0;

vi.mock("@/lib/firebase/admin", () => ({
  getAdminAuth: () => ({ verifyIdToken }),
  getAdminDb: () => ({ collection }),
  getAdminBucket: () => ({ file, name: "test-bucket" }),
}));

const existingPhoto = {
  id: "g1",
  alt: "Photo",
  category: "Campus & Grounds",
  order: 0,
  photoUrl: "https://old",
  photoStoragePath: "gallery/g1/old.jpg",
  createdBy: "staff@earlydays.example",
  createdAt: 1,
};

function resetChain() {
  collection.mockImplementation(() => ({ doc }));
  docCalls = 0;
  doc.mockImplementation(() => (docCalls++ === 0 ? { get: () => Promise.resolve({ exists: false }) } : { get, update }));
  file.mockImplementation(() => ({ save, delete: deleteFile }));
}

type FieldOverrides = {
  alt?: string;
  category?: string;
  tall?: string;
  order?: string;
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

  const req = new NextRequest("http://localhost/api/admin/gallery/g1", { method: "PATCH", headers });
  req.formData = async () => form;
  return req;
}

function context(id = "g1") {
  return { params: { id } };
}

beforeEach(() => {
  vi.clearAllMocks();
  resetChain();
  process.env.ADMIN_EMAILS = "staff@earlydays.example";
  verifyIdToken.mockResolvedValue({ email: "staff@earlydays.example" });
  get.mockResolvedValue({ exists: true, data: () => existingPhoto });
  update.mockResolvedValue(undefined);
  save.mockResolvedValue(undefined);
  deleteFile.mockResolvedValue(undefined);
});

afterEach(() => {
  delete process.env.ADMIN_EMAILS;
  delete process.env.ADMIN_EMAILS_GALLERY;
});

describe("PATCH /api/admin/gallery/[id]", () => {
  it("rejects requests without an Authorization header", async () => {
    verifyIdToken.mockReset();
    const { PATCH } = await import("@/app/api/admin/gallery/[id]/route");
    const res = await PATCH(request({}, { alt: "New alt" }), context());
    expect(res.status).toBe(401);
  });

  it("403s when the token's email isn't authorized", async () => {
    verifyIdToken.mockResolvedValue({ email: "parent@example.com" });
    const { PATCH } = await import("@/app/api/admin/gallery/[id]/route");
    const res = await PATCH(request({ authorization: "Bearer ok" }, { alt: "New alt" }), context());
    expect(res.status).toBe(403);
    expect(update).not.toHaveBeenCalled();
  });

  it("404s when the photo doesn't exist", async () => {
    get.mockResolvedValue({ exists: false });
    const { PATCH } = await import("@/app/api/admin/gallery/[id]/route");
    const res = await PATCH(request({ authorization: "Bearer ok" }, { alt: "New alt" }), context());
    expect(res.status).toBe(404);
  });

  it("400s on an invalid order", async () => {
    const { PATCH } = await import("@/app/api/admin/gallery/[id]/route");
    const res = await PATCH(request({ authorization: "Bearer ok" }, { order: "not-a-number" }), context());
    expect(res.status).toBe(400);
    expect(update).not.toHaveBeenCalled();
  });

  it("400s on an invalid category", async () => {
    const { PATCH } = await import("@/app/api/admin/gallery/[id]/route");
    const res = await PATCH(request({ authorization: "Bearer ok" }, { category: "Not A Category" }), context());
    expect(res.status).toBe(400);
    expect(update).not.toHaveBeenCalled();
  });

  it("updates text fields and returns the merged photo", async () => {
    const { PATCH } = await import("@/app/api/admin/gallery/[id]/route");
    const res = await PATCH(request({ authorization: "Bearer ok" }, { alt: "New alt", tall: "true" }), context());
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ alt: "New alt", tall: true }));
    expect(json).toMatchObject({ id: "g1", alt: "New alt", tall: true });
  });

  it("uploads a new photo and deletes the old one after a successful update", async () => {
    const { PATCH } = await import("@/app/api/admin/gallery/[id]/route");
    const res = await PATCH(
      request({ authorization: "Bearer ok" }, { photo: { filename: "new.jpg", type: "image/jpeg", content: "img" } }),
      context()
    );
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(save).toHaveBeenCalledWith(expect.any(Buffer), { contentType: "image/jpeg" });
    expect(json.photoUrl).toContain("https://firebasestorage.googleapis.com");
    expect(file).toHaveBeenCalledWith("gallery/g1/old.jpg");
    expect(deleteFile).toHaveBeenCalled();
  });

  it("cleans up the newly uploaded photo when the update fails", async () => {
    update.mockRejectedValue(new Error("Firestore is down"));
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const { PATCH } = await import("@/app/api/admin/gallery/[id]/route");
    const res = await PATCH(
      request({ authorization: "Bearer ok" }, { photo: { filename: "new.jpg", type: "image/jpeg", content: "img" } }),
      context()
    );

    expect(res.status).toBe(500);
    expect(deleteFile).toHaveBeenCalled();

    consoleSpy.mockRestore();
  });
});
