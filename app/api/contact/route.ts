import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";

export const runtime = "nodejs";

const MAX_MESSAGE_LENGTH = 2000;

export async function POST(req: NextRequest) {
  const { name, email, phone, message, hp } = (await req.json()) as {
    name?: string;
    email?: string;
    phone?: string;
    message?: string;
    hp?: string;
  };

  // Honeypot: real visitors never fill this hidden field.
  if (hp) {
    return NextResponse.json({ ok: true });
  }

  const trimmedName = name?.trim() ?? "";
  const trimmedEmail = email?.trim() ?? "";
  const trimmedPhone = phone?.trim() ?? "";
  const trimmedMessage = message?.trim() ?? "";

  if (!trimmedName || !trimmedMessage) {
    return NextResponse.json({ error: "Name and message are required" }, { status: 400 });
  }
  if (trimmedMessage.length > MAX_MESSAGE_LENGTH) {
    return NextResponse.json({ error: "Message is too long" }, { status: 400 });
  }
  if (!trimmedEmail && !trimmedPhone) {
    return NextResponse.json({ error: "Provide an email or phone number so we can reply" }, { status: 400 });
  }

  await getAdminDb()
    .collection("inquiries")
    .add({
      name: trimmedName,
      email: trimmedEmail || null,
      phone: trimmedPhone || null,
      message: trimmedMessage,
      status: "new",
      createdAt: Date.now(),
    });

  return NextResponse.json({ ok: true });
}
