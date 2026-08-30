import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { withAdminRoute } from "@/lib/firebase/admin-auth";
import { paths } from "@/lib/firebase/collections";
import type { Parent, PaymentRecord } from "@/lib/firebase/types";

export const runtime = "nodejs";

export const GET = withAdminRoute<{ params: { reference: string } }>(
  "payments",
  "GET /api/admin/payments/[reference]",
  async (req: NextRequest, admin, { params }) => {
    const uid = req.nextUrl.searchParams.get("uid");
    if (!uid) {
      return NextResponse.json({ error: "uid is required" }, { status: 400 });
    }

    const db = getAdminDb();
    const paymentSnap = await db.doc(paths.payment(uid, params.reference)).get();
    if (!paymentSnap.exists) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }

    const parentSnap = await db.doc(paths.parent(uid)).get();
    const parent = parentSnap.exists ? (parentSnap.data() as Parent) : undefined;

    return NextResponse.json({
      payment: paymentSnap.data() as PaymentRecord,
      guardianName: parent?.guardianName ?? "",
      guardianEmail: parent?.email ?? "",
    });
  }
);
