"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { X, CaretLeft, CaretRight } from "@phosphor-icons/react";
import { galleryImages } from "@/lib/data";

const CATEGORIES = ["All", "Campus & Grounds", "Classrooms", "Play & Discovery"] as const;

export default function Gallery() {
  const [activeCategory, setActiveCategory] = useState<(typeof CATEGORIES)[number]>("All");
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);

  const filtered =
    activeCategory === "All"
      ? galleryImages
      : galleryImages.filter((g) => g.category === activeCategory);

  function close() {
    setLightboxIndex(null);
    openerRef.current?.focus();
  }

  function next() {
    setLightboxIndex((i) => (i === null ? null : (i + 1) % filtered.length));
  }

  function prev() {
    setLightboxIndex((i) => (i === null ? null : (i - 1 + filtered.length) % filtered.length));
  }

  useEffect(() => {
    if (lightboxIndex === null) return;
    closeBtnRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "ArrowRight") next();
      if (e.key === "ArrowLeft") prev();
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lightboxIndex, filtered.length]);

  return (
    <div>
      <div className="flex gap-2.5 flex-wrap mb-8" role="group" aria-label="Filter gallery by category">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setActiveCategory(cat)}
            aria-pressed={activeCategory === cat}
            className={`px-4 py-2 rounded-full border font-medium text-sm transition-colors ${
              activeCategory === cat
                ? "bg-sun/[0.16] border-sun text-accent-light"
                : "bg-transparent text-ink border-line hover:border-sun/60"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3.5">
        {filtered.map((img, i) => (
          <button
            key={img.src}
            type="button"
            onClick={(e) => {
              openerRef.current = e.currentTarget;
              setLightboxIndex(i);
            }}
            aria-label={`View larger image: ${img.alt}`}
            className="relative aspect-[4/3] rounded-xl overflow-hidden border border-line group"
          >
            <Image
              src={img.src}
              alt={img.alt}
              fill
              sizes="(min-width: 768px) 33vw, 50vw"
              className="object-cover transition-transform duration-200 group-hover:scale-105"
              loading={i < 3 ? "eager" : "lazy"}
            />
          </button>
        ))}
      </div>

      {lightboxIndex !== null && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={filtered[lightboxIndex].alt}
          className="fixed inset-0 z-[100] bg-chalk/92 backdrop-blur-sm flex items-center justify-center p-4 md:p-10"
          onClick={close}
        >
          <button
            ref={closeBtnRef}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              close();
            }}
            aria-label="Close image"
            className="absolute top-5 right-5 md:top-8 md:right-8 w-10 h-10 rounded-full border border-line bg-paper flex items-center justify-center text-ink hover:border-sun"
          >
            <X size={20} weight="bold" />
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              prev();
            }}
            aria-label="Previous image"
            className="absolute left-3 md:left-8 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full border border-line bg-paper flex items-center justify-center text-ink hover:border-sun"
          >
            <CaretLeft size={20} weight="bold" />
          </button>

          <div
            className="relative w-full max-w-3xl aspect-[4/3]"
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              src={filtered[lightboxIndex].src}
              alt={filtered[lightboxIndex].alt}
              fill
              sizes="(min-width: 768px) 768px, 100vw"
              className="object-contain rounded-card"
            />
          </div>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              next();
            }}
            aria-label="Next image"
            className="absolute right-3 md:right-8 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full border border-line bg-paper flex items-center justify-center text-ink hover:border-sun"
          >
            <CaretRight size={20} weight="bold" />
          </button>

          <p className="absolute bottom-5 left-1/2 -translate-x-1/2 text-ink-soft text-sm max-w-[80%] text-center">
            {filtered[lightboxIndex].alt}
          </p>
        </div>
      )}
    </div>
  );
}
