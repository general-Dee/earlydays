import { NextRequest, NextResponse } from "next/server";
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

export const GET = withAdminRoute("blog", "GET /api/admin/blog", async (req: NextRequest, admin) => {
  const snapshot = await getAdminDb().collection(COLLECTIONS.blog).orderBy("order", "asc").get();
  const posts = snapshot.docs.map((doc) => doc.data() as BlogPost);
  return NextResponse.json({ posts });
});

export const POST = withAdminRoute("blog", "POST /api/admin/blog", async (req: NextRequest, admin) => {
  const form = await req.formData();
  const slug = form.get("slug");
  const category = form.get("category");
  const title = form.get("title");
  const excerpt = form.get("excerpt");
  const body = form.get("body");
  const order = form.get("order");
  const photo = form.get("photo");

  if (
    typeof slug !== "string" ||
    typeof category !== "string" ||
    typeof title !== "string" ||
    typeof excerpt !== "string" ||
    typeof body !== "string" ||
    typeof order !== "string"
  ) {
    return NextResponse.json({ error: "Slug, category, title, excerpt, body, and order are all required" }, { status: 400 });
  }

  const slugResult = validateRequiredString(slug, { label: "Slug", maxLength: 100, pattern: SLUG_PATTERN });
  if (!slugResult.ok) return NextResponse.json({ error: slugResult.error }, { status: 400 });

  const categoryResult = validateRequiredString(category, { label: "Category", maxLength: 60 });
  if (!categoryResult.ok) return NextResponse.json({ error: categoryResult.error }, { status: 400 });

  const titleResult = validateRequiredString(title, { label: "Title", maxLength: 150 });
  if (!titleResult.ok) return NextResponse.json({ error: titleResult.error }, { status: 400 });

  const excerptResult = validateRequiredString(excerpt, { label: "Excerpt", maxLength: 300 });
  if (!excerptResult.ok) return NextResponse.json({ error: excerptResult.error }, { status: 400 });

  const bodyResult = validateRequiredString(body, { label: "Body", maxLength: 20000 });
  if (!bodyResult.ok) return NextResponse.json({ error: bodyResult.error }, { status: 400 });

  const orderValue = Number(order);
  if (!Number.isFinite(orderValue) || !Number.isInteger(orderValue)) {
    return NextResponse.json({ error: "Order must be a whole number" }, { status: 400 });
  }

  const existing = await getAdminDb().collection(COLLECTIONS.blog).where("slug", "==", slugResult.value).limit(1).get();
  if (!existing.empty) {
    return NextResponse.json({ error: "A post with this slug already exists" }, { status: 400 });
  }

  let photoExt: string | undefined;

  if (photo instanceof File) {
    photoExt = ALLOWED_PHOTO_TYPES[photo.type];
    if (!photoExt) {
      return NextResponse.json({ error: "Cover photo must be a JPEG, PNG, or WebP image" }, { status: 400 });
    }
    if (photo.size > MAX_PHOTO_BYTES) {
      return NextResponse.json({ error: "Cover photo is too large (5 MB max)" }, { status: 400 });
    }
  }

  const postRef = getAdminDb().collection(COLLECTIONS.blog).doc();

  let coverPhotoUrl: string | undefined;
  let storagePath: string | undefined;

  if (photo instanceof File && photoExt) {
    storagePath = `blog/${postRef.id}/${postRef.id}-${Date.now()}.${photoExt}`;
    const buffer = Buffer.from(await photo.arrayBuffer());
    await getAdminBucket().file(storagePath).save(buffer, { contentType: photo.type });
    coverPhotoUrl = `https://firebasestorage.googleapis.com/v0/b/${getAdminBucket().name}/o/${encodeURIComponent(storagePath)}?alt=media`;
  }

  const post: BlogPost = {
    id: postRef.id,
    slug: slugResult.value,
    category: categoryResult.value,
    title: titleResult.value,
    excerpt: excerptResult.value,
    body: parseBody(bodyResult.value),
    gradient: "linear-gradient(135deg,#232532,#292b31)",
    order: orderValue,
    createdBy: admin.email,
    createdAt: Date.now(),
    ...(coverPhotoUrl ? { coverPhotoUrl } : {}),
    ...(storagePath ? { coverPhotoStoragePath: storagePath } : {}),
  };

  try {
    await postRef.set(post);
  } catch (err) {
    logRouteError("POST /api/admin/blog", `failed to save blog post doc; cleaning up orphaned file ${storagePath}`, err);
    if (storagePath) {
      await getAdminBucket()
        .file(storagePath)
        .delete()
        .catch((cleanupErr) => {
          logRouteError("POST /api/admin/blog", `failed to clean up orphaned file ${storagePath}`, cleanupErr);
        });
    }
    return NextResponse.json({ error: "Couldn't save this post. Please try again." }, { status: 500 });
  }

  return NextResponse.json(post);
});
