import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminBucket, getAdminDb } from "@/lib/firebase/admin";
import { withAdminRoute } from "@/lib/firebase/admin-auth";
import { logRouteError } from "@/lib/api/errors";
import { COLLECTIONS } from "@/lib/firebase/collections";
import { validateRequiredString } from "@/lib/validation";
import type { Staff } from "@/lib/firebase/types";

export const runtime = "nodejs";

const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
const ALLOWED_PHOTO_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export const PATCH = withAdminRoute<{ params: { id: string } }>(
  "staff",
  "PATCH /api/admin/staff/[id]",
  async (req: NextRequest, admin, { params }) => {
    const staffRef = getAdminDb().collection(COLLECTIONS.staff).doc(params.id);
    const snap = await staffRef.get();
    if (!snap.exists) {
      return NextResponse.json({ error: "Staff member not found" }, { status: 404 });
    }
    const existing = snap.data() as Staff;

    const form = await req.formData();
    const name = form.get("name");
    const role = form.get("role");
    const bio = form.get("bio");
    const order = form.get("order");
    const photo = form.get("photo");
    const removePhoto = form.get("removePhoto") === "true";

    // What actually gets written to Firestore (may contain FieldValue.delete()
    // sentinels) versus what gets echoed back in the response (plain values).
    const firestorePatch: Record<string, unknown> = { updatedAt: Date.now() };
    const responsePatch: Partial<Staff> = {};

    if (typeof name === "string") {
      const result = validateRequiredString(name, { label: "Name", maxLength: 100 });
      if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
      firestorePatch.name = responsePatch.name = result.value;
    }

    if (typeof role === "string") {
      const result = validateRequiredString(role, { label: "Role", maxLength: 120 });
      if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
      firestorePatch.role = responsePatch.role = result.value;
    }

    if (typeof bio === "string") {
      const result = validateRequiredString(bio, { label: "Bio", maxLength: 1000 });
      if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
      firestorePatch.bio = responsePatch.bio = result.value;
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

      newStoragePath = `staff/${params.id}/${params.id}-${Date.now()}.${ext}`;
      const buffer = Buffer.from(await photo.arrayBuffer());
      await getAdminBucket().file(newStoragePath).save(buffer, { contentType: photo.type });
      const photoUrl = `https://firebasestorage.googleapis.com/v0/b/${getAdminBucket().name}/o/${encodeURIComponent(newStoragePath)}?alt=media`;
      firestorePatch.photoUrl = responsePatch.photoUrl = photoUrl;
      firestorePatch.photoStoragePath = responsePatch.photoStoragePath = newStoragePath;
    } else if (removePhoto) {
      firestorePatch.photoUrl = FieldValue.delete();
      firestorePatch.photoStoragePath = FieldValue.delete();
      responsePatch.photoUrl = undefined;
      responsePatch.photoStoragePath = undefined;
    }

    try {
      await staffRef.update(firestorePatch);
    } catch (err) {
      logRouteError("PATCH /api/admin/staff/[id]", `failed to update staff doc; cleaning up orphaned file ${newStoragePath}`, err);
      if (newStoragePath) {
        await getAdminBucket()
          .file(newStoragePath)
          .delete()
          .catch((cleanupErr) => {
            logRouteError("PATCH /api/admin/staff/[id]", `failed to clean up orphaned file ${newStoragePath}`, cleanupErr);
          });
      }
      return NextResponse.json({ error: "Couldn't save these changes. Please try again." }, { status: 500 });
    }

    // Only clean up the old photo file after the doc write succeeds, and only
    // when a new photo replaced it or the photo was explicitly removed.
    if ((newStoragePath || removePhoto) && existing.photoStoragePath) {
      await getAdminBucket()
        .file(existing.photoStoragePath)
        .delete()
        .catch((err) => {
          logRouteError("PATCH /api/admin/staff/[id]", `failed to delete old storage file ${existing.photoStoragePath}`, err);
        });
    }

    return NextResponse.json({ ...existing, ...responsePatch, id: params.id });
  }
);

export const DELETE = withAdminRoute<{ params: { id: string } }>(
  "staff",
  "DELETE /api/admin/staff/[id]",
  async (req: NextRequest, admin, { params }) => {
    const staffRef = getAdminDb().collection(COLLECTIONS.staff).doc(params.id);
    const snap = await staffRef.get();

    if (snap.exists) {
      const { photoStoragePath } = snap.data() as Staff;
      if (photoStoragePath) {
        await getAdminBucket()
          .file(photoStoragePath)
          .delete()
          .catch((err) => {
            logRouteError("DELETE /api/admin/staff/[id]", `failed to delete storage file ${photoStoragePath}`, err);
          });
      }
    }

    await staffRef.delete();

    return NextResponse.json({ ok: true });
  }
);
