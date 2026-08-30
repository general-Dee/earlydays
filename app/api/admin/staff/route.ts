import { NextRequest, NextResponse } from "next/server";
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

export const GET = withAdminRoute("staff", "GET /api/admin/staff", async (req: NextRequest, admin) => {
  const snapshot = await getAdminDb().collection(COLLECTIONS.staff).orderBy("order", "asc").get();
  const staff = snapshot.docs.map((doc) => doc.data() as Staff);
  return NextResponse.json({ staff });
});

export const POST = withAdminRoute("staff", "POST /api/admin/staff", async (req: NextRequest, admin) => {
  const form = await req.formData();
  const name = form.get("name");
  const role = form.get("role");
  const bio = form.get("bio");
  const order = form.get("order");
  const photo = form.get("photo");

  if (typeof name !== "string" || typeof role !== "string" || typeof bio !== "string" || typeof order !== "string") {
    return NextResponse.json({ error: "Name, role, bio, and order are all required" }, { status: 400 });
  }

  const nameResult = validateRequiredString(name, { label: "Name", maxLength: 100 });
  if (!nameResult.ok) return NextResponse.json({ error: nameResult.error }, { status: 400 });

  const roleResult = validateRequiredString(role, { label: "Role", maxLength: 120 });
  if (!roleResult.ok) return NextResponse.json({ error: roleResult.error }, { status: 400 });

  const bioResult = validateRequiredString(bio, { label: "Bio", maxLength: 1000 });
  if (!bioResult.ok) return NextResponse.json({ error: bioResult.error }, { status: 400 });

  const orderValue = Number(order);
  if (!Number.isFinite(orderValue) || !Number.isInteger(orderValue)) {
    return NextResponse.json({ error: "Order must be a whole number" }, { status: 400 });
  }

  let photoExt: string | undefined;

  if (photo instanceof File) {
    photoExt = ALLOWED_PHOTO_TYPES[photo.type];
    if (!photoExt) {
      return NextResponse.json({ error: "Photo must be a JPEG, PNG, or WebP image" }, { status: 400 });
    }
    if (photo.size > MAX_PHOTO_BYTES) {
      return NextResponse.json({ error: "Photo is too large (5 MB max)" }, { status: 400 });
    }
  }

  const staffRef = getAdminDb().collection(COLLECTIONS.staff).doc();

  let photoUrl: string | undefined;
  let storagePath: string | undefined;

  if (photo instanceof File && photoExt) {
    storagePath = `staff/${staffRef.id}/${staffRef.id}-${Date.now()}.${photoExt}`;
    const buffer = Buffer.from(await photo.arrayBuffer());
    await getAdminBucket().file(storagePath).save(buffer, { contentType: photo.type });
    photoUrl = `https://firebasestorage.googleapis.com/v0/b/${getAdminBucket().name}/o/${encodeURIComponent(storagePath)}?alt=media`;
  }

  const staff: Staff = {
    id: staffRef.id,
    name: nameResult.value,
    role: roleResult.value,
    bio: bioResult.value,
    order: orderValue,
    createdBy: admin.email,
    createdAt: Date.now(),
    ...(photoUrl ? { photoUrl } : {}),
    ...(storagePath ? { photoStoragePath: storagePath } : {}),
  };

  try {
    await staffRef.set(staff);
  } catch (err) {
    logRouteError("POST /api/admin/staff", `failed to save staff doc; cleaning up orphaned file ${storagePath}`, err);
    if (storagePath) {
      await getAdminBucket()
        .file(storagePath)
        .delete()
        .catch((cleanupErr) => {
          logRouteError("POST /api/admin/staff", `failed to clean up orphaned file ${storagePath}`, cleanupErr);
        });
    }
    return NextResponse.json({ error: "Couldn't save this staff member. Please try again." }, { status: 500 });
  }

  return NextResponse.json(staff);
});
