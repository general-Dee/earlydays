import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Analytics } from "@vercel/analytics/react";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import WhatsAppFloat from "@/components/WhatsAppFloat";
import { AuthProvider } from "@/lib/firebase/AuthProvider";
import { site } from "@/lib/data";

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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="font-body">
        <AuthProvider>
          <Navbar />
          {children}
          <Footer />
          <WhatsAppFloat />
        </AuthProvider>
        <Analytics />
      </body>
    </html>
  );
}
