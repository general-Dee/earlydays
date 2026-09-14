import { getAdminDb } from "@/lib/firebase/admin";
import { COLLECTIONS } from "@/lib/firebase/collections";
import { site } from "@/lib/data";

export type SiteSettings = {
  whatsapp: string;
  phone: string;
  email: string;
  notifyEmail: string;
};

export function defaultSiteSettings(): SiteSettings {
  return {
    whatsapp: site.whatsapp,
    phone: site.phone,
    email: site.email,
    notifyEmail: process.env.CONTACT_NOTIFY_EMAIL ?? "",
  };
}

export async function getSiteSettings(): Promise<SiteSettings> {
  const snap = await getAdminDb().collection(COLLECTIONS.settings).doc("site").get();
  const stored = snap.exists ? (snap.data() as Partial<SiteSettings>) : {};
  return { ...defaultSiteSettings(), ...stored };
}

export async function setSiteSettings(update: Partial<SiteSettings>, updatedBy: string): Promise<SiteSettings> {
  await getAdminDb()
    .collection(COLLECTIONS.settings)
    .doc("site")
    .set({ ...update, updatedAt: Date.now(), updatedBy }, { merge: true });

  return getSiteSettings();
}
