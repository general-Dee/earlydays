"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { collection, getDocs, orderBy, query } from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase/client";
import { COLLECTIONS } from "@/lib/firebase/collections";
import type { GalleryPhoto } from "@/lib/firebase/types";

const TEASER_COUNT = 6;

export default function GalleryGrid() {
  const [photos, setPhotos] = useState<GalleryPhoto[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const snap = await getDocs(query(collection(getFirebaseDb(), COLLECTIONS.gallery), orderBy("order", "asc")));
        if (cancelled) return;
        setPhotos(snap.docs.map((d) => d.data() as GalleryPhoto));
      } catch {
        // Decorative teaser on the Safety page — degrade silently and just
        // show nothing if the read fails. The full /gallery page surfaces
        // its own error state.
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (photos.length === 0) return null;

  const teaser = photos.slice(0, TEASER_COUNT);

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 auto-rows-[130px]">
      {teaser.map((photo) => (
        <div
          key={photo.id}
          className={`relative rounded-xl overflow-hidden border border-line ${photo.tall ? "row-span-2" : ""}`}
        >
          <Image
            src={photo.photoUrl}
            alt={photo.alt}
            fill
            sizes="(min-width: 1024px) 25vw, 50vw"
            className="object-cover"
            loading="lazy"
          />
        </div>
      ))}
    </div>
  );
}
