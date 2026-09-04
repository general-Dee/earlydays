"use client";

import Image from "next/image";
import Link from "next/link";
import { track } from "@vercel/analytics";
import { site, waLink } from "@/lib/data";
import NewsletterSignupForm from "@/components/NewsletterSignupForm";

export default function Footer() {
  return (
    <footer className="pt-16 pb-8">
      <div className="wrap">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-10">
          <div>
            <div className="flex items-center gap-2.5 mb-3.5">
              <span className="flex bg-[#f3f5fe] rounded-md p-1">
                <Image src="/logo.png" alt="" width={22} height={22} className="block" />
              </span>
              <span className="font-display font-medium text-lg text-ink">{site.name}</span>
            </div>
            <p className="text-ink-soft text-sm">
              Nursery &amp; Primary School — {site.location}.<br />
              One journey, Creche through Primary 6.
            </p>
          </div>

          <div>
            <h2 className="text-ink text-sm font-medium mb-3.5">Visit</h2>
            <a
              href={waLink("Hi, I'd like to know more about Earlydays")}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => track("book_visit_click", { source: "footer" })}
              className="block text-ink-soft text-sm mb-2.5 hover:text-sun transition-colors"
            >
              WhatsApp: {site.phone}
            </a>
            <a href={`tel:${site.phone.replace(/\s/g, "")}`} className="block text-ink-soft text-sm mb-2.5 hover:text-sun transition-colors">
              Call the office
            </a>
            <span className="block text-ink-soft text-sm mb-2.5">{site.location}</span>
          </div>

          <div>
            <h2 className="text-ink text-sm font-medium mb-3.5">Explore</h2>
            <Link href="/journey" className="block text-ink-soft text-sm mb-2.5 hover:text-sun transition-colors">The Journey</Link>
            <Link href="/gallery" className="block text-ink-soft text-sm mb-2.5 hover:text-sun transition-colors">Gallery</Link>
            <Link href="/admissions" className="block text-ink-soft text-sm mb-2.5 hover:text-sun transition-colors">Admissions &amp; Fees</Link>
            <Link href="/events" className="block text-ink-soft text-sm mb-2.5 hover:text-sun transition-colors">Events</Link>
            <Link href="/faq" className="block text-ink-soft text-sm mb-2.5 hover:text-sun transition-colors">FAQs</Link>
          </div>

          <div>
            <h2 className="text-ink text-sm font-medium mb-3.5">Follow</h2>
            <a href="#" className="block text-ink-soft text-sm mb-2.5 hover:text-sun transition-colors">Instagram</a>
            <a href="#" className="block text-ink-soft text-sm mb-2.5 hover:text-sun transition-colors">Facebook</a>
          </div>
        </div>

        <div className="mt-12 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-ink text-sm font-medium mb-1">Stay in the loop</h2>
            <p className="text-ink-soft text-sm mb-0">Occasional news and announcements — no spam.</p>
          </div>
          <NewsletterSignupForm />
        </div>

        <div
          className="mt-8 mb-6 h-px"
          style={{
            background:
              "linear-gradient(to right, transparent, rgba(233,233,237,0.16) 48px, rgba(233,233,237,0.16) calc(100% - 48px), transparent)",
          }}
        />

        <div className="flex flex-wrap justify-between gap-2.5 text-ink-soft text-xs">
          <span>© 2026 {site.fullName}.</span>
          <div className="flex items-center gap-3.5">
            <span>NDPA 2023 compliant · Privacy Policy · Terms</span>
            <Link href="/admin" className="hover:text-sun transition-colors">
              🔒 Staff
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
