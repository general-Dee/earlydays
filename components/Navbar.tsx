import Link from "next/link";
import { navLinks, waLink } from "@/lib/data";
import Button from "./Button";

export default function Navbar() {
  return (
    <header className="sticky top-0 z-50 bg-chalk/85 backdrop-blur-md border-b border-line">
      <nav className="wrap flex items-center justify-between py-4">
        <Link href="/" className="flex items-center gap-2.5 font-display font-medium text-xl text-ink">
          Earlydays
        </Link>

        <div className="hidden lg:flex gap-6 text-sm">
          {navLinks.map((l) => (
            <Link key={l.href} href={l.href} className="text-ink hover:text-sun transition-colors">
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
