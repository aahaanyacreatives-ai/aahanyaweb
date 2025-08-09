"use client";
import { useState } from "react";
import Image from "next/image";

export function ProductCarousel({ images, alt }: { images: string[]; alt: string }) {
  const [active, setActive] = useState(0);
  if (!images || images.length === 0) return (
    <div className="relative aspect-square rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center">
      <Image src="/placeholder.jpg" alt={alt} fill className="object-cover" />
    </div>
  );

  return (
    <div>
      <div className="relative aspect-square overflow-hidden rounded-lg">
        <Image
          src={images[active]}
          alt={`${alt} (${active + 1})`}
          fill
          className="object-cover"
          priority
        />
        {images.length > 1 && (
          <>
            <button
              onClick={() => setActive(x => Math.max(0, x - 1))}
              disabled={active === 0}
              className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/80 rounded-full p-1.5 text-2xl"
            >‹</button>
            <button
              onClick={() => setActive(x => Math.min(images.length - 1, x + 1))}
              disabled={active === images.length - 1}
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/80 rounded-full p-1.5 text-2xl"
            >›</button>
          </>
        )}
      </div>
      {images.length > 1 && (
        <div className="flex gap-2 mt-2 justify-center">
          {images.map((img, idx) => (
            <button
              key={img}
              onClick={() => setActive(idx)}
              className={`h-12 w-12 rounded border transition-all ${active === idx ? "border-primary ring-2 ring-primary" : "border-gray-200"}`}
              aria-label={`Show image ${idx+1}`}
              type="button"
            >
              <Image src={img} width={48} height={48} alt={`${alt} (${idx+1})`} className="object-cover w-full h-full rounded" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
