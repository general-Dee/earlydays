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

const existingStaff = {
  id: "s1",
  name: "Mrs. Grace A.",
  role: "Head of Nursery",
  bio: "Bio",
  order: 0,
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
  name?: string;
  role?: string;
  bio?: string;
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

  const req = new NextRequest("http://localhost/api/admin/staff/s1", { method: "PATCH", headers });
  req.formData = async () => form;
  return req;
}

function context(id = "s1") {
  return { params: { id } };
}

beforeEach(() => {
  vi.clearAllMocks();
  resetChain();
  process.env.ADMIN_EMAILS = "staff@earlydays.example";
  verifyIdToken.mockResolvedValue({ email: "staff@earlydays.example" });
  get.mockResolvedValue({ exists: true, data: () => existingStaff });
  update.mockResolvedValue(undefined);
  save.mockResolvedValue(undefined);
  deleteFile.mockResolvedValue(undefined);
});

afterEach(() => {
  delete process.env.ADMIN_EMAILS;
  delete process.env.ADMIN_EMAILS_STAFF;
});

describe("PATCH /api/admin/staff/[id]", () => {
  it("rejects requests without an Authorization header", async () => {
    verifyIdToken.mockReset();
    const { PATCH } = await import("@/app/api/admin/staff/[id]/route");
    const res = await PATCH(request({}, { name: "New Name" }), context());
    expect(res.status).toBe(401);
  });

  it("403s when the token's email isn't authorized", async () => {
    verifyIdToken.mockResolvedValue({ email: "parent@example.com" });
    const { PATCH } = await import("@/app/api/admin/staff/[id]/route");
    const res = await PATCH(request({ authorization: "Bearer ok" }, { name: "New Name" }), context());
    expect(res.status).toBe(403);
    expect(update).not.toHaveBeenCalled();
  });

  it("404s when the staff member doesn't exist", async () => {
    get.mockResolvedValue({ exists: false });
    const { PATCH } = await import("@/app/api/admin/staff/[id]/route");
    const res = await PATCH(request({ authorization: "Bearer ok" }, { name: "New Name" }), context());
    expect(res.status).toBe(404);
  });

  it("400s on an invalid order", async () => {
    const { PATCH } = await import("@/app/api/admin/staff/[id]/route");
    const res = await PATCH(request({ authorization: "Bearer ok" }, { order: "not-a-number" }), context());
    expect(res.status).toBe(400);
    expect(update).not.toHaveBeenCalled();
  });

  it("updates text fields and returns the merged staff member", async () => {
    const { PATCH } = await import("@/app/api/admin/staff/[id]/route");
    const res = await PATCH(request({ authorization: "Bearer ok" }, { name: "New Name" }), context());
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ name: "New Name" }));
    expect(json).toMatchObject({ id: "s1", name: "New Name", role: "Head of Nursery" });
  });

  it("uploads a new photo and deletes the old one after a successful update", async () => {
    const withOldPhoto = { ...existingStaff, photoUrl: "https://old", photoStoragePath: "staff/s1/old.jpg" };
    get.mockResolvedValue({ exists: true, data: () => withOldPhoto });

    const { PATCH } = await import("@/app/api/admin/staff/[id]/route");
    const res = await PATCH(
      request({ authorization: "Bearer ok" }, { photo: { filename: "new.jpg", type: "image/jpeg", content: "img" } }),
      context()
    );
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(save).toHaveBeenCalledWith(expect.any(Buffer), { contentType: "image/jpeg" });
    expect(json.photoUrl).toContain("https://firebasestorage.googleapis.com");
    expect(file).toHaveBeenCalledWith("staff/s1/old.jpg");
    expect(deleteFile).toHaveBeenCalled();
  });

  it("removes the photo when removePhoto is set", async () => {
    const withOldPhoto = { ...existingStaff, photoUrl: "https://old", photoStoragePath: "staff/s1/old.jpg" };
    get.mockResolvedValue({ exists: true, data: () => withOldPhoto });

    const { PATCH } = await import("@/app/api/admin/staff/[id]/route");
    const res = await PATCH(request({ authorization: "Bearer ok" }, { removePhoto: "true" }), context());
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(file).toHaveBeenCalledWith("staff/s1/old.jpg");
    expect(deleteFile).toHaveBeenCalled();
    expect(json.photoUrl).toBeUndefined();
    expect(json.photoStoragePath).toBeUndefined();
  });

  it("cleans up the newly uploaded photo when the update fails", async () => {
    update.mockRejectedValue(new Error("Firestore is down"));
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const { PATCH } = await import("@/app/api/admin/staff/[id]/route");
    const res = await PATCH(
      request({ authorization: "Bearer ok" }, { photo: { filename: "new.jpg", type: "image/jpeg", content: "img" } }),
      context()
    );

    expect(res.status).toBe(500);
    expect(deleteFile).toHaveBeenCalled();

    consoleSpy.mockRestore();
  });
});
