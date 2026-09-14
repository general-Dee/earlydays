import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Analytics } from "@vercel/analytics/react";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import WhatsAppFloat from "@/components/WhatsAppFloat";
import { AuthProvider } from "@/lib/firebase/AuthProvider";
import { SiteSettingsProvider } from "@/lib/firebase/site-settings-context";
import { site } from "@/lib/data";
import { getSiteSettings } from "@/lib/siteSettings";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  weight: ["400", "500", "600", "700"],
});

const description =
  "One school, one journey — from Creche to Primary 6, on a single campus in Kaduna, Nigeria.";

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: "Earlydays Nursery & Primary School — Kaduna",
  description,
  openGraph: {
    type: "website",
    siteName: site.fullName,
    title: "Earlydays Nursery & Primary School — Kaduna",
    description,
  },
  twitter: {
    card: "summary_large_image",
  },
};

// WhatsApp/phone/email are admin-editable (see /admin/settings) — revalidate
// periodically so a change shows up sitewide without a redeploy.
export const revalidate = 300;

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { whatsapp, phone, email } = await getSiteSettings();

  return (
    <html lang="en" className={inter.variable}>
      <body className="font-body">
        <SiteSettingsProvider value={{ whatsapp, phone, email }}>
          <AuthProvider>
            <Navbar />
            {children}
            <Footer />
            <WhatsAppFloat />
          </AuthProvider>
        </SiteSettingsProvider>
        <Analytics />
      </body>
    </html>
  );
}
