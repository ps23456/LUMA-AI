"use client";

import { useState } from "react";
import type { GalleryProps } from "@/types/blocks";

function proxyUrl(src: string): string {
  return `/api/image-proxy?url=${encodeURIComponent(src)}`;
}

function GalleryImage({
  src,
  alt,
  span,
}: {
  src?: string;
  alt: string;
  span: string;
}) {
  const [failed, setFailed] = useState(false);

  return (
    <div
      className={`group relative overflow-hidden rounded-2xl ${span} min-h-[200px] cursor-pointer bg-gradient-to-br from-[var(--accent)]/10 to-[var(--accent)]/5 transition-transform hover:scale-[1.02]`}
    >
      {src && !failed ? (
        <img
          src={proxyUrl(src)}
          alt={alt}
          referrerPolicy="no-referrer"
          loading="lazy"
          onError={() => setFailed(true)}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
        />
      ) : (
        <div className="flex h-full items-center justify-center text-5xl opacity-20">
          &#128247;
        </div>
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
      <div className="absolute bottom-0 left-0 right-0 translate-y-4 p-4 opacity-0 transition-all group-hover:translate-y-0 group-hover:opacity-100">
        <p className="text-sm font-semibold text-white">{alt}</p>
      </div>
    </div>
  );
}

const SPAN_PATTERNS = [
  "col-span-2 row-span-2",
  "col-span-1 row-span-1",
  "col-span-1 row-span-1",
  "col-span-1 row-span-2",
  "col-span-1 row-span-1",
  "col-span-2 row-span-1",
  "col-span-1 row-span-1",
  "col-span-1 row-span-1",
];

export function GalleryBlock({ heading, subheading, images }: GalleryProps) {
  return (
    <section className="py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl" style={{ fontFamily: "var(--font-theme, inherit)" }}>
            {heading}
          </h2>
          <p className="mt-4 text-base opacity-60">{subheading}</p>
        </div>
        <div className="mt-12 grid auto-rows-[180px] grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {images.map((img, i) => (
            <GalleryImage
              key={img.alt}
              src={img.src}
              alt={img.alt}
              span={SPAN_PATTERNS[i % SPAN_PATTERNS.length]}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
