import { NextRequest, NextResponse } from "next/server";
import { getAdminBucket, getAdminDb } from "@/lib/firebase/admin";
import { withAdminRoute } from "@/lib/firebase/admin-auth";
import { logRouteError } from "@/lib/api/errors";
import { COLLECTIONS } from "@/lib/firebase/collections";
import { validateRequiredString } from "@/lib/validation";
import type { GalleryPhoto } from "@/lib/firebase/types";

export const runtime = "nodejs";

const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
const ALLOWED_PHOTO_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

const CATEGORIES = ["Campus & Grounds", "Classrooms", "Play & Discovery"] as const;

function isValidCategory(value: string): value is GalleryPhoto["category"] {
  return (CATEGORIES as readonly string[]).includes(value);
}

export const PATCH = withAdminRoute<{ params: { id: string } }>(
  "gallery",
  "PATCH /api/admin/gallery/[id]",
  async (req: NextRequest, admin, { params }) => {
    const photoRef = getAdminDb().collection(COLLECTIONS.gallery).doc(params.id);
    const snap = await photoRef.get();
    if (!snap.exists) {
      return NextResponse.json({ error: "Photo not found" }, { status: 404 });
    }
    const existing = snap.data() as GalleryPhoto;

    const form = await req.formData();
    const alt = form.get("alt");
    const category = form.get("category");
    const tall = form.get("tall");
    const order = form.get("order");
    const photo = form.get("photo");

    const firestorePatch: Record<string, unknown> = { updatedAt: Date.now() };
    const responsePatch: Partial<GalleryPhoto> = {};

    if (typeof alt === "string") {
      const result = validateRequiredString(alt, { label: "Alt text", maxLength: 200 });
      if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
      firestorePatch.alt = responsePatch.alt = result.value;
    }

    if (typeof category === "string") {
      if (!isValidCategory(category)) {
        return NextResponse.json({ error: "Category must be one of: " + CATEGORIES.join(", ") }, { status: 400 });
      }
      firestorePatch.category = responsePatch.category = category;
    }

    if (typeof tall === "string") {
      firestorePatch.tall = responsePatch.tall = tall === "true";
    }

    if (typeof order === "string") {
      const orderValue = Number(order);
      if (!Number.isFinite(orderValue) || !Number.isInteger(orderValue)) {
        return NextResponse.json({ error: "Order must be a whole number" }, { status: 400 });
      }
      firestorePatch.order = responsePatch.order = orderValue;
    }

    let newStoragePath: string | undefined;

    if (photo instanceof File) {
      const ext = ALLOWED_PHOTO_TYPES[photo.type];
      if (!ext) {
        return NextResponse.json({ error: "Photo must be a JPEG, PNG, or WebP image" }, { status: 400 });
      }
      if (photo.size > MAX_PHOTO_BYTES) {
        return NextResponse.json({ error: "Photo is too large (5 MB max)" }, { status: 400 });
      }

      newStoragePath = `gallery/${params.id}/${params.id}-${Date.now()}.${ext}`;
      const buffer = Buffer.from(await photo.arrayBuffer());
      await getAdminBucket().file(newStoragePath).save(buffer, { contentType: photo.type });
      const photoUrl = `https://firebasestorage.googleapis.com/v0/b/${getAdminBucket().name}/o/${encodeURIComponent(newStoragePath)}?alt=media`;
      firestorePatch.photoUrl = responsePatch.photoUrl = photoUrl;
      firestorePatch.photoStoragePath = responsePatch.photoStoragePath = newStoragePath;
    }

    try {
      await photoRef.update(firestorePatch);
    } catch (err) {
      logRouteError("PATCH /api/admin/gallery/[id]", `failed to update gallery photo doc; cleaning up orphaned file ${newStoragePath}`, err);
      if (newStoragePath) {
        await getAdminBucket()
          .file(newStoragePath)
          .delete()
          .catch((cleanupErr) => {
            logRouteError("PATCH /api/admin/gallery/[id]", `failed to clean up orphaned file ${newStoragePath}`, cleanupErr);
          });
      }
      return NextResponse.json({ error: "Couldn't save these changes. Please try again." }, { status: 500 });
    }

    // Only clean up the old photo file after the doc write succeeds, and only
    // when a new photo replaced it.
    if (newStoragePath && existing.photoStoragePath) {
      await getAdminBucket()
        .file(existing.photoStoragePath)
        .delete()
        .catch((err) => {
          logRouteError("PATCH /api/admin/gallery/[id]", `failed to delete old storage file ${existing.photoStoragePath}`, err);
        });
    }

    return NextResponse.json({ ...existing, ...responsePatch, id: params.id });
  }
);

export const DELETE = withAdminRoute<{ params: { id: string } }>(
  "gallery",
  "DELETE /api/admin/gallery/[id]",
  async (req: NextRequest, admin, { params }) => {
    const photoRef = getAdminDb().collection(COLLECTIONS.gallery).doc(params.id);
    const snap = await photoRef.get();

    if (snap.exists) {
      const { photoStoragePath } = snap.data() as GalleryPhoto;
      if (photoStoragePath) {
        await getAdminBucket()
          .file(photoStoragePath)
          .delete()
          .catch((err) => {
            logRouteError("DELETE /api/admin/gallery/[id]", `failed to delete storage file ${photoStoragePath}`, err);
          });
      }
    }

    await photoRef.delete();

    return NextResponse.json({ ok: true });
  }
);
