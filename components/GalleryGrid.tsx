import { galleryCells } from "@/lib/data";

export default function GalleryGrid() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 auto-rows-[130px]">
      {galleryCells.map((g) => (
        <div
          key={g.label}
          className={`rounded-xl flex items-center justify-center text-white font-mono text-xs uppercase tracking-wider opacity-90 ${
            g.tall ? "row-span-2" : ""
          }`}
          style={{ background: g.gradient }}
        >
          {g.label}
        </div>
      ))}
    </div>
  );
}
