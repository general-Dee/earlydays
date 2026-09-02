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

export const GET = withAdminRoute("gallery", "GET /api/admin/gallery", async (req: NextRequest, admin) => {
  const snapshot = await getAdminDb().collection(COLLECTIONS.gallery).orderBy("order", "asc").get();
  const photos = snapshot.docs.map((doc) => doc.data() as GalleryPhoto);
  return NextResponse.json({ photos });
});

export const POST = withAdminRoute("gallery", "POST /api/admin/gallery", async (req: NextRequest, admin) => {
  const form = await req.formData();
  const alt = form.get("alt");
  const category = form.get("category");
  const tall = form.get("tall") === "true";
  const order = form.get("order");
  const photo = form.get("photo");

  if (typeof alt !== "string" || typeof category !== "string" || typeof order !== "string") {
    return NextResponse.json({ error: "Alt text, category, and order are all required" }, { status: 400 });
  }

  const altResult = validateRequiredString(alt, { label: "Alt text", maxLength: 200 });
  if (!altResult.ok) return NextResponse.json({ error: altResult.error }, { status: 400 });

  if (!isValidCategory(category)) {
    return NextResponse.json({ error: "Category must be one of: " + CATEGORIES.join(", ") }, { status: 400 });
  }

  const orderValue = Number(order);
  if (!Number.isFinite(orderValue) || !Number.isInteger(orderValue)) {
    return NextResponse.json({ error: "Order must be a whole number" }, { status: 400 });
  }

  if (!(photo instanceof File)) {
    return NextResponse.json({ error: "A photo is required" }, { status: 400 });
  }

  const photoExt = ALLOWED_PHOTO_TYPES[photo.type];
  if (!photoExt) {
    return NextResponse.json({ error: "Photo must be a JPEG, PNG, or WebP image" }, { status: 400 });
  }
  if (photo.size > MAX_PHOTO_BYTES) {
    return NextResponse.json({ error: "Photo is too large (5 MB max)" }, { status: 400 });
  }

  const photoRef = getAdminDb().collection(COLLECTIONS.gallery).doc();
  const storagePath = `gallery/${photoRef.id}/${photoRef.id}-${Date.now()}.${photoExt}`;
  const buffer = Buffer.from(await photo.arrayBuffer());
  await getAdminBucket().file(storagePath).save(buffer, { contentType: photo.type });
  const photoUrl = `https://firebasestorage.googleapis.com/v0/b/${getAdminBucket().name}/o/${encodeURIComponent(storagePath)}?alt=media`;

  const galleryPhoto: GalleryPhoto = {
    id: photoRef.id,
    alt: altResult.value,
    category,
    order: orderValue,
    photoUrl,
    photoStoragePath: storagePath,
    createdBy: admin.email,
    createdAt: Date.now(),
    ...(tall ? { tall: true } : {}),
  };

  try {
    await photoRef.set(galleryPhoto);
  } catch (err) {
    logRouteError("POST /api/admin/gallery", `failed to save gallery photo doc; cleaning up orphaned file ${storagePath}`, err);
    await getAdminBucket()
      .file(storagePath)
      .delete()
      .catch((cleanupErr) => {
        logRouteError("POST /api/admin/gallery", `failed to clean up orphaned file ${storagePath}`, cleanupErr);
      });
    return NextResponse.json({ error: "Couldn't save this photo. Please try again." }, { status: 500 });
  }

  return NextResponse.json(galleryPhoto);
});
