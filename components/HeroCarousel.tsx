"use client" // Required for hooks

import Image from "next/image"
import { useState, useRef, useEffect } from "react"

const IMAGES = [
  { src: "/bracelet-hero.jpg", alt: "brecelete" },
  { src: "/image-1.png", alt: "Silver Ankh Pendant" },
  { src: "/watch.png", alt: "Golden Watch Bracelet" },
  { src: "/ring.jpg", alt: "Gold Ring with Flowers" },
]

export default function HeroCarousel() {
  const [activeIdx, setActiveIdx] = useState(0)
  const touchStartX = useRef(0)
  const touchEndX = useRef(0)

  // Auto-play
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveIdx((i) => (i + 1) % IMAGES.length)
    }, 4000)
    return () => clearInterval(interval)
  }, [])

  // Swipe handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.changedTouches.length > 0) {
      touchStartX.current = e.changedTouches.item(0).clientX
    }
  }
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (e.changedTouches.length > 0) {
      touchEndX.current = e.changedTouches.item(0).clientX
    }
    if (touchStartX.current - touchEndX.current > 50) {
      setActiveIdx((i) => (i + 1) % IMAGES.length)
    }
    if (touchEndX.current - touchStartX.current > 50) {
      setActiveIdx((i) => (i - 1 + IMAGES.length) % IMAGES.length)
    }
  }

  return (
    <div
      className="relative w-full aspect-[5/4] md:aspect-[1/1] max-w-[400px] md:max-w-[450px] mx-auto rounded-xl shadow-lg overflow-hidden bg-[#f5ece3]"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      tabIndex={0}
      aria-label="Jewellery product carousel"
    >
      {IMAGES.map(({ src, alt }, idx) => (
        <Image
          key={idx}
          src={src}
          alt={alt}
          fill
          sizes="(max-width: 768px) 85vw, 450px"
          style={{
            objectFit: "cover",
            transition: "opacity 0.7s cubic-bezier(0.4,0,0.2,1)",
            opacity: idx === activeIdx ? 1 : 0,
            zIndex: idx === activeIdx ? 1 : 0,
            pointerEvents: idx === activeIdx ? "auto" : "none",
          }}
          className="absolute inset-0"
          priority={idx === 0}
        />
      ))}

      {/* Dots */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2 z-10">
        {IMAGES.map((_, idx) => (
          <button
            key={idx}
            className={`w-2.5 h-2.5 rounded-full transition bg-white/60 ${activeIdx === idx ? "ring-2 bg-[#ef4482]" : "bg-[#fff9f4]"}`}
            aria-label={`Jump to slide ${idx + 1}`}
            onClick={() => setActiveIdx(idx)}
            tabIndex={0}
          />
        ))}
      </div>
    </div>
  )
}
