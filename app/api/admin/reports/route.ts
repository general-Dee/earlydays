import { NextRequest, NextResponse } from "next/server";
import { getAdminDb, getAdminBucket } from "@/lib/firebase/admin";
import { requireAdminEmail } from "@/lib/firebase/admin-auth";
import type { ChildRecord, ProgressReport } from "@/lib/firebase/types";

export const runtime = "nodejs";

const MAX_TERM_LENGTH = 60;
const MAX_FILE_BYTES = 10 * 1024 * 1024;

export async function GET(req: NextRequest) {
  const admin = await requireAdminEmail(req, "reports");
  if (admin instanceof NextResponse) return admin;

  const snapshot = await getAdminDb().collection("parents").orderBy("guardianName", "asc").get();
  const parents = snapshot.docs.map((doc) => {
    const data = doc.data() as { guardianName: string; email: string; children: ChildRecord[] };
    return { uid: doc.id, guardianName: data.guardianName, email: data.email, children: data.children ?? [] };
  });

  return NextResponse.json({ parents });
}

export async function POST(req: NextRequest) {
  const admin = await requireAdminEmail(req, "reports");
  if (admin instanceof NextResponse) return admin;

  const form = await req.formData();
  const parentUid = form.get("parentUid");
  const childId = form.get("childId");
  const childName = form.get("childName");
  const term = form.get("term");
  const file = form.get("file");

  if (
    typeof parentUid !== "string" ||
    typeof childId !== "string" ||
    typeof childName !== "string" ||
    typeof term !== "string" ||
    !(file instanceof File)
  ) {
    return NextResponse.json({ error: "Parent, child, term, and file are all required" }, { status: 400 });
  }

  const trimmedParentUid = parentUid.trim();
  const trimmedChildId = childId.trim();
  const trimmedChildName = childName.trim();
  const trimmedTerm = term.trim();

  if (!trimmedParentUid || !trimmedChildId || !trimmedChildName || !trimmedTerm) {
    return NextResponse.json({ error: "Parent, child, term, and file are all required" }, { status: 400 });
  }
  if (trimmedTerm.length > MAX_TERM_LENGTH) {
    return NextResponse.json({ error: "Term is too long" }, { status: 400 });
  }
  if (file.type !== "application/pdf") {
    return NextResponse.json({ error: "Only PDF files are accepted" }, { status: 400 });
  }
  if (file.size > MAX_FILE_BYTES) {
    return NextResponse.json({ error: "File is too large (10 MB max)" }, { status: 400 });
  }

  const parentSnap = await getAdminDb().collection("parents").doc(trimmedParentUid).get();
  if (!parentSnap.exists) {
    return NextResponse.json({ error: "Parent not found" }, { status: 404 });
  }

  const reportRef = getAdminDb().collection("parents").doc(trimmedParentUid).collection("reports").doc();
  const storagePath = `reports/${trimmedParentUid}/${reportRef.id}.pdf`;

  const buffer = Buffer.from(await file.arrayBuffer());
  await getAdminBucket().file(storagePath).save(buffer, { contentType: "application/pdf" });

  const report: ProgressReport = {
    id: reportRef.id,
    childId: trimmedChildId,
    childName: trimmedChildName,
    term: trimmedTerm,
    fileName: file.name,
    storagePath,
    uploadedBy: admin.email,
    createdAt: Date.now(),
  };

  await reportRef.set(report);

  return NextResponse.json(report);
}
