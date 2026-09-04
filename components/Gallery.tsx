"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { X, CaretLeft, CaretRight, MagnifyingGlass } from "@phosphor-icons/react";
import { collection, getDocs, orderBy, query } from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase/client";
import { COLLECTIONS } from "@/lib/firebase/collections";
import type { GalleryPhoto } from "@/lib/firebase/types";

type LoadState = "loading" | "error" | "ready";

const CATEGORIES = ["All", "Campus & Grounds", "Classrooms", "Play & Discovery"] as const;

export default function Gallery() {
  const [photos, setPhotos] = useState<GalleryPhoto[]>([]);
  const [state, setState] = useState<LoadState>("loading");
  const [activeCategory, setActiveCategory] = useState<(typeof CATEGORIES)[number]>("All");
  const [search, setSearch] = useState("");
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setState("loading");
      try {
        const snap = await getDocs(query(collection(getFirebaseDb(), COLLECTIONS.gallery), orderBy("order", "asc")));

        if (cancelled) return;

        setPhotos(snap.docs.map((d) => d.data() as GalleryPhoto));
        setState("ready");
      } catch {
        if (!cancelled) setState("error");
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const byCategory = activeCategory === "All" ? photos : photos.filter((g) => g.category === activeCategory);
  const needle = search.trim().toLowerCase();
  const filtered = needle ? byCategory.filter((g) => g.alt.toLowerCase().includes(needle)) : byCategory;

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

  if (state === "loading") {
    return <p className="text-sm text-slate">Loading the gallery…</p>;
  }

  if (state === "error") {
    return (
      <div className="px-3.5 py-3 rounded-lg bg-clay-soft text-clay text-[0.85rem] font-semibold">
        Couldn&rsquo;t load the gallery. Please try again.
      </div>
    );
  }

  if (photos.length === 0) {
    return <p className="text-sm text-slate">Gallery photos are coming soon.</p>;
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3.5 mb-8">
        <div className="flex gap-2.5 flex-wrap" role="group" aria-label="Filter gallery by category">
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

        <div className="relative ml-auto w-full sm:w-56">
          <MagnifyingGlass size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search photos…"
            aria-label="Search gallery photos"
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-line bg-chalk text-ink text-[0.85rem]"
          />
        </div>
      </div>

      {filtered.length === 0 && (
        <p className="text-sm text-slate">No photos match your search.</p>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3.5">
        {filtered.map((img, i) => (
          <button
            key={img.id}
            type="button"
            onClick={(e) => {
              openerRef.current = e.currentTarget;
              setLightboxIndex(i);
            }}
            aria-label={`View larger image: ${img.alt}`}
            className="relative aspect-[4/3] rounded-xl overflow-hidden border border-line group"
          >
            <Image
              src={img.photoUrl}
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
              src={filtered[lightboxIndex].photoUrl}
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
