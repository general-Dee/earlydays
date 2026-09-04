"use client";

import { useState } from "react";
import { CaretDown } from "@phosphor-icons/react";
import type { Faq } from "@/lib/firebase/types";

export default function FaqAccordion({ faqs }: { faqs: Faq[] }) {
  const [openId, setOpenId] = useState<string | null>(faqs[0]?.id ?? null);

  return (
    <div className="flex flex-col gap-3 max-w-2xl">
      {faqs.map((faq) => {
        const isOpen = openId === faq.id;

        return (
          <div key={faq.id} className="card overflow-hidden">
            <button
              type="button"
              onClick={() => setOpenId(isOpen ? null : faq.id)}
              aria-expanded={isOpen}
              className="w-full flex items-center justify-between gap-4 text-left px-6 py-5"
            >
              <span className="font-display font-medium text-base text-ink">{faq.question}</span>
              <CaretDown
                size={18}
                weight="bold"
                className={`shrink-0 text-slate transition-transform ${isOpen ? "rotate-180" : ""}`}
              />
            </button>
            {isOpen && <p className="px-6 pb-5 -mt-1 text-sm text-ink/[0.78]">{faq.answer}</p>}
          </div>
        );
      })}
    </div>
  );
}
