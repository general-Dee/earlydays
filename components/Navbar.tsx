import Link from "next/link";
import { navLinks, waLink } from "@/lib/data";
import Button from "./Button";

export default function Navbar() {
  return (
    <header className="sticky top-0 z-50 bg-chalk/85 backdrop-blur-md border-b border-line">
      <nav className="wrap flex items-center justify-between py-4">
        <Link href="/" className="flex items-center gap-2.5 font-display font-bold text-xl text-ink">
          <span className="w-9 h-9 rounded-[10px] bg-gradient-to-br from-sun to-clay text-white flex items-center justify-center font-display font-bold text-lg">
            E
          </span>
          Earlydays
        </Link>

        <div className="hidden lg:flex gap-6 text-sm font-semibold">
          {navLinks.map((l) => (
            <Link key={l.href} href={l.href} className="text-ink/80 hover:text-ink transition-colors">
              {l.label}
            </Link>
          ))}
        </div>

        <Button
          href={waLink("Hi, I'd like to book a tour for my child")}
          external
          size="sm"
        >
          Book a Visit
        </Button>
      </nav>
    </header>
  );
}
