import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminBucket, getAdminDb } from "@/lib/firebase/admin";
import { withAdminRoute } from "@/lib/firebase/admin-auth";
import { logRouteError } from "@/lib/api/errors";
import { COLLECTIONS } from "@/lib/firebase/collections";
import { validateRequiredString } from "@/lib/validation";
import type { BlogPost } from "@/lib/firebase/types";

export const runtime = "nodejs";

const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
const ALLOWED_PHOTO_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

const SLUG_PATTERN = { regex: /^[a-z0-9]+(-[a-z0-9]+)*$/, message: "Slug must be lowercase letters, numbers, and hyphens only" };

function parseBody(raw: string): string[] {
  return raw
    .split(/\n\s*\n/)
    .map((para) => para.trim())
    .filter(Boolean);
}

export const PATCH = withAdminRoute<{ params: { id: string } }>(
  "blog",
  "PATCH /api/admin/blog/[id]",
  async (req: NextRequest, admin, { params }) => {
    const postRef = getAdminDb().collection(COLLECTIONS.blog).doc(params.id);
    const snap = await postRef.get();
    if (!snap.exists) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }
    const existing = snap.data() as BlogPost;

    const form = await req.formData();
    const slug = form.get("slug");
    const category = form.get("category");
    const title = form.get("title");
    const excerpt = form.get("excerpt");
    const body = form.get("body");
    const order = form.get("order");
    const photo = form.get("photo");
    const removePhoto = form.get("removePhoto") === "true";

    // What actually gets written to Firestore (may contain FieldValue.delete()
    // sentinels) versus what gets echoed back in the response (plain values).
    const firestorePatch: Record<string, unknown> = { updatedAt: Date.now() };
    const responsePatch: Partial<BlogPost> = {};

    if (typeof slug === "string") {
      const result = validateRequiredString(slug, { label: "Slug", maxLength: 100, pattern: SLUG_PATTERN });
      if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
      if (result.value !== existing.slug) {
        const clash = await getAdminDb().collection(COLLECTIONS.blog).where("slug", "==", result.value).limit(1).get();
        if (!clash.empty) {
          return NextResponse.json({ error: "A post with this slug already exists" }, { status: 400 });
        }
      }
      firestorePatch.slug = responsePatch.slug = result.value;
    }

    if (typeof category === "string") {
      const result = validateRequiredString(category, { label: "Category", maxLength: 60 });
      if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
      firestorePatch.category = responsePatch.category = result.value;
    }

    if (typeof title === "string") {
      const result = validateRequiredString(title, { label: "Title", maxLength: 150 });
      if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
      firestorePatch.title = responsePatch.title = result.value;
    }

    if (typeof excerpt === "string") {
      const result = validateRequiredString(excerpt, { label: "Excerpt", maxLength: 300 });
      if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
      firestorePatch.excerpt = responsePatch.excerpt = result.value;
    }

    if (typeof body === "string") {
      const result = validateRequiredString(body, { label: "Body", maxLength: 20000 });
      if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
      firestorePatch.body = responsePatch.body = parseBody(result.value);
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
        return NextResponse.json({ error: "Cover photo must be a JPEG, PNG, or WebP image" }, { status: 400 });
      }
      if (photo.size > MAX_PHOTO_BYTES) {
        return NextResponse.json({ error: "Cover photo is too large (5 MB max)" }, { status: 400 });
      }

      newStoragePath = `blog/${params.id}/${params.id}-${Date.now()}.${ext}`;
      const buffer = Buffer.from(await photo.arrayBuffer());
      await getAdminBucket().file(newStoragePath).save(buffer, { contentType: photo.type });
      const coverPhotoUrl = `https://firebasestorage.googleapis.com/v0/b/${getAdminBucket().name}/o/${encodeURIComponent(newStoragePath)}?alt=media`;
      firestorePatch.coverPhotoUrl = responsePatch.coverPhotoUrl = coverPhotoUrl;
      firestorePatch.coverPhotoStoragePath = responsePatch.coverPhotoStoragePath = newStoragePath;
    } else if (removePhoto) {
      firestorePatch.coverPhotoUrl = FieldValue.delete();
      firestorePatch.coverPhotoStoragePath = FieldValue.delete();
      responsePatch.coverPhotoUrl = undefined;
      responsePatch.coverPhotoStoragePath = undefined;
    }

    try {
      await postRef.update(firestorePatch);
    } catch (err) {
      logRouteError("PATCH /api/admin/blog/[id]", `failed to update blog post doc; cleaning up orphaned file ${newStoragePath}`, err);
      if (newStoragePath) {
        await getAdminBucket()
          .file(newStoragePath)
          .delete()
          .catch((cleanupErr) => {
            logRouteError("PATCH /api/admin/blog/[id]", `failed to clean up orphaned file ${newStoragePath}`, cleanupErr);
          });
      }
      return NextResponse.json({ error: "Couldn't save these changes. Please try again." }, { status: 500 });
    }

    // Only clean up the old photo file after the doc write succeeds, and only
    // when a new photo replaced it or the photo was explicitly removed.
    if ((newStoragePath || removePhoto) && existing.coverPhotoStoragePath) {
      await getAdminBucket()
        .file(existing.coverPhotoStoragePath)
        .delete()
        .catch((err) => {
          logRouteError("PATCH /api/admin/blog/[id]", `failed to delete old storage file ${existing.coverPhotoStoragePath}`, err);
        });
    }

    return NextResponse.json({ ...existing, ...responsePatch, id: params.id });
  }
);

export const DELETE = withAdminRoute<{ params: { id: string } }>(
  "blog",
  "DELETE /api/admin/blog/[id]",
  async (req: NextRequest, admin, { params }) => {
    const postRef = getAdminDb().collection(COLLECTIONS.blog).doc(params.id);
    const snap = await postRef.get();

    if (snap.exists) {
      const { coverPhotoStoragePath } = snap.data() as BlogPost;
      if (coverPhotoStoragePath) {
        await getAdminBucket()
          .file(coverPhotoStoragePath)
          .delete()
          .catch((err) => {
            logRouteError("DELETE /api/admin/blog/[id]", `failed to delete storage file ${coverPhotoStoragePath}`, err);
          });
      }
    }

    await postRef.delete();

    return NextResponse.json({ ok: true });
  }
);
