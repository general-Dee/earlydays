"use client";

import { track } from "@vercel/analytics";
import { waLink } from "@/lib/data";

export default function ProspectusCard() {
  return (
    <div className="bg-ground-card border border-line rounded-card p-8 flex flex-col justify-between">
      <div>
        <h2 className="font-display font-medium text-ink text-xl mb-1.5">Get the full prospectus</h2>
        <p className="text-ink/[0.72] text-sm mb-0">
          Curriculum, daily schedule, uniform list, and full fee breakdown in one PDF.
        </p>
      </div>
      <a
        href="/prospectus.pdf"
        onClick={() => track("prospectus_download")}
        className="btn btn-primary btn-sm mt-5 justify-center text-accent-light border-accent-light hover:bg-accent-light/[0.12]"
      >
        Download Prospectus
      </a>
      <a
        href={waLink("Hi, I'd like to start an admission inquiry")}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => track("book_visit_click", { source: "prospectus_card" })}
        className="btn btn-ghost btn-sm mt-2.5 justify-center"
      >
        Start Inquiry on WhatsApp
      </a>
    </div>
  );
}
