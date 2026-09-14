"use client";

import { createContext, useContext } from "react";
import { site } from "@/lib/data";

export type PublicSiteSettings = { whatsapp: string; phone: string; email: string };

// Falls back to the env-var-backed defaults from lib/data.ts so components
// (and their tests) work unwrapped — RootLayout overrides this with the
// admin-editable values from Firestore (see lib/siteSettings.ts).
const defaultSettings: PublicSiteSettings = { whatsapp: site.whatsapp, phone: site.phone, email: site.email };

const SiteSettingsContext = createContext<PublicSiteSettings>(defaultSettings);

export function SiteSettingsProvider({
  value,
  children,
}: {
  value: PublicSiteSettings;
  children: React.ReactNode;
}) {
  return <SiteSettingsContext.Provider value={value}>{children}</SiteSettingsContext.Provider>;
}

export function useSiteSettings(): PublicSiteSettings {
  return useContext(SiteSettingsContext);
}
