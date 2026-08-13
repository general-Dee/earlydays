import Link from "next/link";
import { site, waLink } from "@/lib/data";

export default function Footer() {
  return (
    <footer className="bg-ink text-white pt-16 pb-8">
      <div className="wrap">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-10">
          <div>
            <div className="flex items-center gap-2.5 font-display font-bold text-xl mb-3.5">
              <span className="w-9 h-9 rounded-[10px] bg-gradient-to-br from-sun to-clay text-white flex items-center justify-center font-display font-bold text-lg">
                E
              </span>
              {site.name}
            </div>
            <p className="text-[#9AA5C2] text-sm">
              Nursery &amp; Primary School — {site.location}.<br />
              One journey, Creche through Primary 6.
            </p>
          </div>

          <div>
            <h4 className="text-white text-sm font-semibold mb-4">Visit</h4>
            <a href={waLink("Hi, I'd like to know more about Earlydays")} target="_blank" rel="noopener noreferrer" className="block text-[#C3CBE0] text-sm mb-2.5 hover:text-white">
              WhatsApp: {site.phone}
            </a>
            <a href={`tel:${site.phone.replace(/\s/g, "")}`} className="block text-[#C3CBE0] text-sm mb-2.5 hover:text-white">
              Call the office
            </a>
            <span className="block text-[#C3CBE0] text-sm mb-2.5">{site.location}</span>
          </div>

          <div>
            <h4 className="text-white text-sm font-semibold mb-4">Explore</h4>
            <Link href="/journey" className="block text-[#C3CBE0] text-sm mb-2.5 hover:text-white">The Journey</Link>
            <Link href="/admissions" className="block text-[#C3CBE0] text-sm mb-2.5 hover:text-white">Admissions &amp; Fees</Link>
            <Link href="/events" className="block text-[#C3CBE0] text-sm mb-2.5 hover:text-white">Events</Link>
          </div>

          <div>
            <h4 className="text-white text-sm font-semibold mb-4">Follow</h4>
            <a href="#" className="block text-[#C3CBE0] text-sm mb-2.5 hover:text-white">Instagram</a>
            <a href="#" className="block text-[#C3CBE0] text-sm mb-2.5 hover:text-white">Facebook</a>
          </div>
        </div>

        <div className="border-t border-[#2C3A5E] mt-12 pt-6 flex flex-wrap justify-between gap-2.5 text-[#8A96B5] text-xs">
          <span>© 2026 {site.fullName}.</span>
          <span>NDPA 2023 compliant · Privacy Policy · Terms</span>
        </div>
      </div>
    </footer>
  );
}
