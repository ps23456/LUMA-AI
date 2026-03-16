"use client";

import type { LogoCloudProps } from "@/types/blocks";

function proxyUrl(src: string): string {
  return `/api/image-proxy?url=${encodeURIComponent(src)}`;
}

export function LogoCloudBlock({
  heading,
  subheading,
  logos,
}: LogoCloudProps) {
  const doubled = [...logos, ...logos];

  return (
    <section className="py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {heading && (
          <div className="mb-10 text-center">
            <h2 className="text-lg font-semibold uppercase tracking-wider opacity-40">
              {heading}
            </h2>
            {subheading && (
              <p className="mt-2 text-sm opacity-30">{subheading}</p>
            )}
          </div>
        )}
        <div className="relative overflow-hidden">
          <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-24 bg-gradient-to-r from-inherit to-transparent" />
          <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-24 bg-gradient-to-l from-inherit to-transparent" />
          <div className="group flex w-max animate-marquee items-center gap-12 hover:[animation-play-state:paused]">
            {doubled.map((logo, i) => (
              <div
                key={`${logo.name}-${i}`}
                className="flex h-14 shrink-0 items-center gap-2.5 rounded-xl border border-current/5 bg-white/5 px-6 opacity-50 transition-opacity hover:opacity-100"
              >
                {logo.image ? (
                  <img
                    src={proxyUrl(logo.image)}
                    alt={logo.name}
                    className="h-8 w-auto max-w-[120px] object-contain object-center grayscale opacity-70"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                ) : (
                  <span className="text-xl">{logo.icon ?? "🏢"}</span>
                )}
                <span className="whitespace-nowrap text-sm font-semibold tracking-wide">
                  {logo.name}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
      <style>{`
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-marquee {
          animation: marquee 30s linear infinite;
        }
      `}</style>
    </section>
  );
}
