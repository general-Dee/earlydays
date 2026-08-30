import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { withAdminRoute } from "@/lib/firebase/admin-auth";
import { COLLECTIONS } from "@/lib/firebase/collections";
import { validateRequiredString } from "@/lib/validation";
import { generateReferenceCode } from "@/lib/referenceCode";
import { stages } from "@/lib/data";

export const runtime = "nodejs";

const MAX_NAME_LENGTH = 200;
const MAX_NOTES_LENGTH = 2000;
const VALID_STAGE_CODES = stages.map((s) => s.code);

export const GET = withAdminRoute("applications", "GET /api/admin/applications", async (req: NextRequest, admin) => {
  const snapshot = await getAdminDb().collection(COLLECTIONS.applications).orderBy("createdAt", "desc").get();
  const applications = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

  return NextResponse.json({ applications });
});

export const POST = withAdminRoute("applications", "POST /api/admin/applications", async (req: NextRequest, admin) => {
  const { childName, childDob, desiredStage, guardianName, email, phone, notes } = (await req.json()) as {
    childName?: string;
    childDob?: string;
    desiredStage?: string;
    guardianName?: string;
    email?: string;
    phone?: string;
    notes?: string;
  };

  const childNameResult = validateRequiredString(childName, { label: "Child's name", maxLength: MAX_NAME_LENGTH });
  if (!childNameResult.ok) return NextResponse.json({ error: childNameResult.error }, { status: 400 });

  const childDobResult = validateRequiredString(childDob, { label: "Child's date of birth", maxLength: 20 });
  if (!childDobResult.ok) return NextResponse.json({ error: childDobResult.error }, { status: 400 });

  const guardianNameResult = validateRequiredString(guardianName, {
    label: "Guardian name",
    maxLength: MAX_NAME_LENGTH,
  });
  if (!guardianNameResult.ok) return NextResponse.json({ error: guardianNameResult.error }, { status: 400 });

  const trimmedStage = desiredStage?.trim() ?? "";
  if (!VALID_STAGE_CODES.includes(trimmedStage)) {
    return NextResponse.json({ error: "Please select a valid stage" }, { status: 400 });
  }

  const trimmedEmail = email?.trim() ?? "";
  const trimmedPhone = phone?.trim() ?? "";
  if (!trimmedEmail && !trimmedPhone) {
    return NextResponse.json({ error: "Provide an email or phone number" }, { status: 400 });
  }

  const trimmedNotes = notes?.trim() ?? "";
  if (trimmedNotes.length > MAX_NOTES_LENGTH) {
    return NextResponse.json({ error: "Notes are too long" }, { status: 400 });
  }

  const application = {
    childName: childNameResult.value,
    childDob: childDobResult.value,
    desiredStage: trimmedStage,
    guardianName: guardianNameResult.value,
    email: trimmedEmail || null,
    phone: trimmedPhone || null,
    notes: trimmedNotes,
    status: "new" as const,
    referenceCode: generateReferenceCode(),
    createdAt: Date.now(),
  };

  const ref = await getAdminDb().collection(COLLECTIONS.applications).add(application);

  return NextResponse.json({ id: ref.id, ...application });
});
