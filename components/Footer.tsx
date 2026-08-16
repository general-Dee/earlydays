import Image from "next/image";
import Link from "next/link";
import { site, waLink } from "@/lib/data";

export default function Footer() {
  return (
    <footer className="pt-16 pb-8">
      <div className="wrap">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-10">
          <div>
            <div className="flex items-center gap-2.5 mb-3.5">
              <span className="flex bg-[#f3f5fe] rounded-md p-1">
                <Image src="/logo.png" alt="Earlydays" width={22} height={22} className="block" />
              </span>
              <span className="font-display font-medium text-lg text-ink">{site.name}</span>
            </div>
            <p className="text-ink-soft text-sm">
              Nursery &amp; Primary School — {site.location}.<br />
              One journey, Creche through Primary 6.
            </p>
          </div>

          <div>
            <h4 className="text-ink text-sm font-medium mb-3.5">Visit</h4>
            <a href={waLink("Hi, I'd like to know more about Earlydays")} target="_blank" rel="noopener noreferrer" className="block text-ink-soft text-sm mb-2.5 hover:text-sun transition-colors">
              WhatsApp: {site.phone}
            </a>
            <a href={`tel:${site.phone.replace(/\s/g, "")}`} className="block text-ink-soft text-sm mb-2.5 hover:text-sun transition-colors">
              Call the office
            </a>
            <span className="block text-ink-soft text-sm mb-2.5">{site.location}</span>
          </div>

          <div>
            <h4 className="text-ink text-sm font-medium mb-3.5">Explore</h4>
            <Link href="/journey" className="block text-ink-soft text-sm mb-2.5 hover:text-sun transition-colors">The Journey</Link>
            <Link href="/gallery" className="block text-ink-soft text-sm mb-2.5 hover:text-sun transition-colors">Gallery</Link>
            <Link href="/admissions" className="block text-ink-soft text-sm mb-2.5 hover:text-sun transition-colors">Admissions &amp; Fees</Link>
            <Link href="/events" className="block text-ink-soft text-sm mb-2.5 hover:text-sun transition-colors">Events</Link>
          </div>

          <div>
            <h4 className="text-ink text-sm font-medium mb-3.5">Follow</h4>
            <a href="#" className="block text-ink-soft text-sm mb-2.5 hover:text-sun transition-colors">Instagram</a>
            <a href="#" className="block text-ink-soft text-sm mb-2.5 hover:text-sun transition-colors">Facebook</a>
          </div>
        </div>

        <div
          className="mt-12 mb-6 h-px"
          style={{
            background:
              "linear-gradient(to right, transparent, rgba(233,233,237,0.16) 48px, rgba(233,233,237,0.16) calc(100% - 48px), transparent)",
          }}
        />

        <div className="flex flex-wrap justify-between gap-2.5 text-ink-soft text-xs">
          <span>© 2026 {site.fullName}.</span>
          <span>NDPA 2023 compliant · Privacy Policy · Terms</span>
        </div>
      </div>
    </footer>
  );
}
