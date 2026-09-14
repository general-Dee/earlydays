import { NextRequest, NextResponse } from "next/server";
import { withSuperAdminRoute } from "@/lib/firebase/admin-auth";
import { getSiteSettings, setSiteSettings, type SiteSettings } from "@/lib/siteSettings";
import { logAdminAction } from "@/lib/audit";

export const runtime = "nodejs";

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export const GET = withSuperAdminRoute("GET /api/admin/settings", async () => {
  const settings = await getSiteSettings();
  return NextResponse.json(settings);
});

export const PATCH = withSuperAdminRoute("PATCH /api/admin/settings", async (req: NextRequest, admin) => {
  const body = (await req.json().catch(() => ({}))) as Partial<Record<keyof SiteSettings, unknown>>;
  const { whatsapp, phone, email, notifyEmail } = body;

  if (whatsapp === undefined && phone === undefined && email === undefined && notifyEmail === undefined) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const update: Partial<SiteSettings> = {};

  if (whatsapp !== undefined) {
    if (typeof whatsapp !== "string" || !/^\d{10,15}$/.test(whatsapp)) {
      return NextResponse.json(
        { error: "Enter a valid WhatsApp number (digits only, with country code)" },
        { status: 400 }
      );
    }
    update.whatsapp = whatsapp;
  }

  if (phone !== undefined) {
    if (typeof phone !== "string" || phone.trim().length === 0) {
      return NextResponse.json({ error: "Enter a valid phone number" }, { status: 400 });
    }
    update.phone = phone.trim();
  }

  if (email !== undefined) {
    if (typeof email !== "string" || !isValidEmail(email)) {
      return NextResponse.json({ error: "Enter a valid contact email" }, { status: 400 });
    }
    update.email = email.trim();
  }

  if (notifyEmail !== undefined) {
    if (typeof notifyEmail !== "string" || !isValidEmail(notifyEmail)) {
      return NextResponse.json({ error: "Enter a valid notification email" }, { status: 400 });
    }
    update.notifyEmail = notifyEmail.trim();
  }

  const settings = await setSiteSettings(update, admin.email);

  await logAdminAction({
    action: "settings.site_updated",
    actorEmail: admin.email,
    detail: Object.keys(update).join(", "),
  });

  return NextResponse.json(settings);
});
