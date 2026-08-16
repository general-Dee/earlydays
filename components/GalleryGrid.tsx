import Image from "next/image";
import { galleryImages } from "@/lib/data";

const TEASER_SRCS = ["/ct01.PNG", "/ct04.PNG", "/ct09.PNG", "/ct06.PNG", "/ct02.PNG", "/ct08.PNG"];

export default function GalleryGrid() {
  const teaser = TEASER_SRCS.map((src) => galleryImages.find((g) => g.src === src)).filter(
    (g): g is NonNullable<typeof g> => Boolean(g)
  );

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 auto-rows-[130px]">
      {teaser.map((g) => (
        <div
          key={g.src}
          className={`relative rounded-xl overflow-hidden border border-line ${g.tall ? "row-span-2" : ""}`}
        >
          <Image
            src={g.src}
            alt={g.alt}
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
