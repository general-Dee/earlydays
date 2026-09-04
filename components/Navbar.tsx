"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { List, X } from "@phosphor-icons/react";
import { track } from "@vercel/analytics";
import { navLinks, waLink } from "@/lib/data";
import Button from "./Button";

export default function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-chalk/85 backdrop-blur-md border-b border-line">
      <nav className="wrap flex items-center justify-between py-4">
        <Link href="/" className="flex items-center gap-2.5 font-display font-medium text-xl text-ink">
          <span className="flex bg-[#f3f5fe] rounded-md p-1">
            <Image src="/logo.png" alt="" width={32} height={32} className="block" />
          </span>
          Earlydays
        </Link>

        <div className="hidden lg:flex gap-6 text-sm">
          {navLinks.map((l) => (
            <Link key={l.href} href={l.href} className="text-ink hover:text-sun transition-colors">
              {l.label}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <Button
            href={waLink("Hi, I'd like to book a tour for my child")}
            external
            size="sm"
            onClick={() => track("book_visit_click", { source: "navbar" })}
          >
            Book a Visit
          </Button>

          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-label="Toggle navigation menu"
            className="lg:hidden flex items-center justify-center text-ink"
          >
            {open ? <X size={22} weight="bold" /> : <List size={22} weight="bold" />}
          </button>
        </div>
      </nav>

      {open && (
        <nav aria-label="Mobile" className="lg:hidden wrap flex flex-col gap-4 pb-5 text-sm">
          {navLinks.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className="text-ink hover:text-sun transition-colors"
            >
              {l.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
