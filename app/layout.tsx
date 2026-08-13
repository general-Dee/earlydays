import type { Metadata } from "next";
import { Fraunces, Manrope, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import WhatsAppFloat from "@/components/WhatsAppFloat";
import { AuthProvider } from "@/lib/firebase/AuthProvider";
import { site } from "@/lib/data";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  weight: ["400", "500", "600", "700"],
});

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  weight: ["400", "500", "600", "700", "800"],
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  variable: "--font-plex-mono",
  weight: ["500", "600"],
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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${fraunces.variable} ${manrope.variable} ${plexMono.variable}`}>
      <body className="font-body">
        <AuthProvider>
          <Navbar />
          {children}
          <Footer />
          <WhatsAppFloat />
        </AuthProvider>
      </body>
    </html>
  );
}
