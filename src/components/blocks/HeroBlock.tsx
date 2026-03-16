"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import Link from "next/link";
import type { HeroProps, HeroSlide } from "@/types/blocks";

function proxyUrl(src: string): string {
  return `/api/image-proxy?url=${encodeURIComponent(src)}`;
}

function SlideImage({
  src,
  alt,
  fallbackQuery,
}: {
  src: string;
  alt: string;
  fallbackQuery?: string;
}) {
  const [currentSrc, setCurrentSrc] = useState(src);
  const [failed, setFailed] = useState(false);
  const [triedFallback, setTriedFallback] = useState(false);

  const handleError = useCallback(() => {
    if (!triedFallback && fallbackQuery?.trim()) {
      setTriedFallback(true);
      const q = encodeURIComponent(fallbackQuery.trim());
      fetch(`/api/image-search?q=${q}&count=1`)
        .then((r) => r.json())
        .then((data) => {
          const url = data.urls?.[0];
          if (url) setCurrentSrc(url);
          else setFailed(true);
        })
        .catch(() => setFailed(true));
    } else {
      setFailed(true);
    }
  }, [fallbackQuery, triedFallback]);

  if (failed) {
    return (
      <div className="h-full w-full bg-gradient-to-br from-[var(--accent)]/40 via-black/20 to-[var(--accent)]/20" />
    );
  }
  return (
    <img
      src={proxyUrl(currentSrc)}
      alt={alt}
      referrerPolicy="no-referrer"
      loading="lazy"
      onError={handleError}
      className="h-full w-full object-cover"
    />
  );
}

/* ─── Overlay layout: full-width background image with centered text ───── */
function OverlayHero({
  slide,
  stats,
  ctaVariant,
}: {
  slide: HeroSlide;
  stats?: Array<{ value: string; label: string }>;
  ctaVariant?: "accent" | "outlined";
}) {
  const isOutlined = ctaVariant === "outlined";
  const ctaClass = isOutlined
    ? "inline-flex items-center gap-2 rounded-full border-2 border-black bg-white px-8 py-3.5 text-sm font-semibold uppercase tracking-wider text-black transition-all hover:scale-105 hover:bg-black hover:text-white"
    : "inline-flex items-center gap-2 rounded-full bg-[var(--accent)] px-8 py-3.5 text-sm font-semibold text-white transition-all hover:scale-105 hover:shadow-lg hover:shadow-[var(--accent)]/25";

  return (
    <section className="relative flex min-h-[70vh] items-center justify-center overflow-hidden">
      {slide.backgroundImage ? (
        <div className="absolute inset-0">
          <SlideImage
            src={slide.backgroundImage}
            alt={slide.heading}
            fallbackQuery={slide.imageQuery || `${slide.heading} flowers bouquet`}
          />
          <div className="absolute inset-0 bg-black/40" />
        </div>
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-[var(--accent)]/30 via-transparent to-[var(--accent)]/10" />
      )}

      <div className="relative z-10 mx-auto max-w-4xl px-4 py-24 text-center sm:px-6 lg:px-8">
        {slide.badge && (
          <span className="mb-6 inline-flex items-center gap-1.5 rounded-full bg-white/20 px-4 py-1.5 text-sm font-medium text-white backdrop-blur-sm">
            {slide.badge}
          </span>
        )}
        <h1
          className="text-5xl uppercase leading-tight text-white sm:text-6xl lg:text-8xl"
          style={{
            fontFamily: "var(--font-theme, inherit)",
            fontWeight: "var(--heading-weight, 700)",
            letterSpacing: "var(--heading-letter-spacing, 0.05em)",
          }}
        >
          {slide.heading}
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-white/80 sm:text-lg">
          {slide.subheading}
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          <Link href={slide.ctaHref} className={ctaClass}>
            {slide.ctaText}
            {!isOutlined && <span>&rarr;</span>}
          </Link>
          {slide.secondaryCtaText && slide.secondaryCtaHref && (
            <Link
              href={slide.secondaryCtaHref}
              className="inline-flex items-center gap-2 rounded-full border border-white/40 px-8 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-white/10"
            >
              {slide.secondaryCtaText}
            </Link>
          )}
        </div>
        {stats && stats.length > 0 && (
          <div className="mt-12 flex flex-wrap justify-center gap-8 border-t border-white/20 pt-8">
            {stats.map((stat) => (
              <div key={stat.label} className="text-white">
                <p className="text-3xl font-bold">{stat.value}</p>
                <p className="text-sm opacity-60">{stat.label}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

/* ─── Centered layout: gradient or image background, centered text ────── */
function CenteredHero({
  slide,
  stats,
}: {
  slide: HeroSlide;
  stats?: Array<{ value: string; label: string }>;
}) {
  return (
    <section className="relative overflow-hidden py-24 sm:py-32 lg:py-40">
      {slide.backgroundImage ? (
        <>
          <div className="absolute inset-0">
            <SlideImage
              src={slide.backgroundImage}
              alt={slide.heading}
              fallbackQuery={slide.imageQuery || `${slide.heading} flowers bouquet`}
            />
            <div className="absolute inset-0 bg-black/50" />
          </div>
        </>
      ) : (
        <>
          <div className="absolute inset-0 bg-gradient-to-br from-[var(--accent)]/15 via-transparent to-[var(--accent)]/5" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,var(--accent)_0%,transparent_50%)] opacity-10" />
        </>
      )}

      <div className="relative z-10 mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
        {slide.badge && (
          <span className={`mb-6 inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium ${slide.backgroundImage ? "bg-white/20 text-white" : "bg-[var(--accent)]/15 text-[var(--accent)]"}`}>
            <span>&#9733;</span>
            {slide.badge}
          </span>
        )}
        <h1
          className={`text-4xl uppercase leading-[0.95] sm:text-5xl lg:text-7xl ${slide.backgroundImage ? "text-white" : ""}`}
          style={{
            fontFamily: "var(--font-theme, inherit)",
            fontWeight: "var(--heading-weight, 900)",
            letterSpacing: "var(--heading-letter-spacing, -0.025em)",
          }}
        >
          {slide.heading}
        </h1>
        <p className={`mx-auto mt-6 max-w-2xl text-base leading-relaxed sm:text-lg ${slide.backgroundImage ? "text-white/90" : "opacity-70"}`}>
          {slide.subheading}
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          <Link
            href={slide.ctaHref}
            className={`inline-flex items-center gap-2 rounded-full px-8 py-3.5 text-sm font-semibold transition-all hover:scale-105 ${slide.backgroundImage ? "border-2 border-white bg-white/10 text-white hover:bg-white hover:text-black" : "bg-[var(--accent)] text-white hover:shadow-lg hover:shadow-[var(--accent)]/25"}`}
          >
            {slide.ctaText}
            <span>&rarr;</span>
          </Link>
          {slide.secondaryCtaText && slide.secondaryCtaHref && (
            <Link
              href={slide.secondaryCtaHref}
              className="inline-flex items-center gap-2 rounded-full border border-current/20 px-8 py-3.5 text-sm font-semibold transition-colors hover:bg-white/5"
            >
              {slide.secondaryCtaText}
            </Link>
          )}
        </div>
        {stats && stats.length > 0 && (
          <div className="mt-12 flex flex-wrap justify-center gap-8 border-t border-current/10 pt-8">
            {stats.map((stat) => (
              <div key={stat.label}>
                <p className="text-3xl font-bold">{stat.value}</p>
                <p className="text-sm opacity-50">{stat.label}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

/* ─── Split layout: text on left, image on right ───────────────────────── */
function SplitHero({
  slide,
  stats,
}: {
  slide: HeroSlide;
  stats?: Array<{ value: string; label: string }>;
}) {
  return (
    <section className="relative overflow-hidden py-20 sm:py-28 lg:py-36">
      <div className="absolute inset-0 bg-gradient-to-br from-[var(--accent)]/10 via-transparent to-transparent" />
      <div className="relative mx-auto grid max-w-7xl gap-12 px-4 sm:px-6 lg:grid-cols-2 lg:items-center lg:px-8">
        <div>
          {slide.badge && (
            <span className="mb-6 inline-flex items-center gap-1.5 rounded-full bg-[var(--accent)]/15 px-4 py-1.5 text-sm font-medium text-[var(--accent)]">
              <span>&#9733;</span>
              {slide.badge}
            </span>
          )}
          <h1
            className="text-4xl uppercase leading-[0.95] sm:text-5xl lg:text-7xl"
            style={{
              fontFamily: "var(--font-theme, inherit)",
              fontWeight: "var(--heading-weight, 900)",
              letterSpacing: "var(--heading-letter-spacing, -0.025em)",
            }}
          >
            {slide.heading.split(" ").map((word, i) => (
              <span
                key={i}
                className={
                  i % 2 !== 0 ? "block italic text-[var(--accent)]" : "block"
                }
              >
                {word}{" "}
              </span>
            ))}
          </h1>
          <p className="mt-6 max-w-lg text-base leading-relaxed opacity-70 sm:text-lg">
            {slide.subheading}
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Link
              href={slide.ctaHref}
              className="inline-flex items-center gap-2 rounded-full bg-[var(--accent)] px-7 py-3 text-sm font-semibold text-white transition-all hover:scale-105 hover:shadow-lg hover:shadow-[var(--accent)]/25"
            >
              {slide.ctaText}
              <span>&rarr;</span>
            </Link>
            {slide.secondaryCtaText && slide.secondaryCtaHref && (
              <Link
                href={slide.secondaryCtaHref}
                className="inline-flex items-center gap-2 rounded-full border border-current/20 px-7 py-3 text-sm font-semibold transition-colors hover:bg-white/5"
              >
                {slide.secondaryCtaText}
              </Link>
            )}
          </div>
          {stats && stats.length > 0 && (
            <div className="mt-12 flex flex-wrap gap-8 border-t border-current/10 pt-8">
              {stats.map((stat) => (
                <div key={stat.label}>
                  <p className="text-3xl font-bold">{stat.value}</p>
                  <p className="text-sm opacity-50">{stat.label}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {slide.backgroundImage && (
          <div className="relative aspect-square overflow-hidden rounded-3xl lg:aspect-[4/5]">
            <SlideImage
              src={slide.backgroundImage}
              alt={slide.heading}
              fallbackQuery={slide.imageQuery || `${slide.heading} flowers bouquet`}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
          </div>
        )}
      </div>
    </section>
  );
}

/* ─── Multi-panel layout: 3+ columns side-by-side, each with image+title+CTA ─ */
function MultiPanelHero({
  slides,
  ctaVariant,
}: {
  slides: HeroSlide[];
  ctaVariant?: "accent" | "outlined";
}) {
  const isOutlined = ctaVariant === "outlined";
  const ctaClass = isOutlined
    ? "inline-flex items-center gap-2 rounded-full border-2 border-black bg-white px-6 py-2.5 text-xs font-semibold uppercase tracking-wider text-black transition-all hover:scale-105 hover:bg-black hover:text-white"
    : "inline-flex items-center gap-2 rounded-full bg-[var(--accent)] px-6 py-2.5 text-xs font-semibold text-white transition-all hover:scale-105 hover:shadow-lg";

  return (
    <section className="py-12 sm:py-16 lg:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {slides.map((slide, idx) => (
            <div
              key={idx}
              className="group relative overflow-hidden rounded-2xl bg-white/5"
            >
              <div className="relative aspect-[4/5] overflow-hidden">
                {slide.backgroundImage ? (
                  <SlideImage
                    src={slide.backgroundImage}
                    alt={slide.heading}
                    fallbackQuery={slide.imageQuery || `${slide.heading} flowers bouquet`}
                  />
                ) : (
                  <div className="flex h-full items-center justify-center bg-gradient-to-br from-[var(--accent)]/20 to-[var(--accent)]/5 text-6xl opacity-30">
                    &#127800;
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
              </div>
              <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                <h3
                  className="text-xl font-bold uppercase tracking-wider sm:text-2xl"
                  style={{
                    fontFamily: "var(--font-theme, inherit)",
                    fontWeight: "var(--heading-weight, 700)",
                    letterSpacing: "var(--heading-letter-spacing, 0.05em)",
                  }}
                >
                  {slide.heading}
                </h3>
                <Link href={slide.ctaHref} className={`mt-4 block w-fit ${ctaClass}`}>
                  {slide.ctaText}
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── Carousel layout: multiple slides with arrows and dots ────────────── */
function CarouselHero({
  slides,
  autoPlayInterval,
}: {
  slides: HeroSlide[];
  autoPlayInterval: number;
}) {
  const [active, setActive] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const goTo = useCallback(
    (idx: number) => {
      setActive((idx + slides.length) % slides.length);
    },
    [slides.length],
  );

  useEffect(() => {
    if (isPaused) return;
    timerRef.current = setInterval(() => {
      setActive((prev) => (prev + 1) % slides.length);
    }, autoPlayInterval);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPaused, slides.length, autoPlayInterval]);

  return (
    <section
      className="relative overflow-hidden"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div className="relative h-[600px] overflow-hidden sm:h-[650px] lg:h-[700px]">
        {slides.map((slide, idx) => (
          <div
            key={idx}
            className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${
              idx === active
                ? "pointer-events-auto z-10 opacity-100"
                : "pointer-events-none z-0 opacity-0"
            }`}
          >
            {slide.backgroundImage ? (
              <div className="absolute inset-0 overflow-hidden">
                <SlideImage
                  src={slide.backgroundImage}
                  alt={slide.heading}
                  fallbackQuery={slide.imageQuery || `${slide.heading} flowers bouquet`}
                />
                <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/50 to-black/20" />
              </div>
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-[var(--accent)]/20 via-transparent to-[var(--accent)]/5" />
            )}

            <div className="relative flex h-full items-center">
              <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
                <div className="max-w-xl">
                  {slide.badge && (
                    <span className="mb-4 inline-flex items-center gap-1.5 rounded-full bg-[var(--accent)] px-4 py-1.5 text-sm font-medium text-white">
                      <span>&#9733;</span>
                      {slide.badge}
                    </span>
                  )}
                  <h2
                    className="text-4xl uppercase leading-[0.95] text-white sm:text-5xl lg:text-6xl"
                    style={{
                      fontFamily: "var(--font-theme, inherit)",
                      fontWeight: "var(--heading-weight, 900)",
                      letterSpacing: "var(--heading-letter-spacing, -0.025em)",
                    }}
                  >
                    {slide.heading.split(" ").map((word, i) => (
                      <span
                        key={i}
                        className={
                          i % 2 !== 0
                            ? "block italic text-[var(--accent)]"
                            : "block"
                        }
                      >
                        {word}{" "}
                      </span>
                    ))}
                  </h2>
                  <p className="mt-5 max-w-md text-base leading-relaxed text-white/70 sm:text-lg">
                    {slide.subheading}
                  </p>
                  <div className="mt-8 flex flex-wrap items-center gap-4">
                    <Link
                      href={slide.ctaHref}
                      className="inline-flex items-center gap-2 rounded-full bg-[var(--accent)] px-7 py-3 text-sm font-semibold text-white transition-all hover:scale-105 hover:shadow-lg hover:shadow-[var(--accent)]/25"
                    >
                      {slide.ctaText}
                      <span>&rarr;</span>
                    </Link>
                    {slide.secondaryCtaText && slide.secondaryCtaHref && (
                      <Link
                        href={slide.secondaryCtaHref}
                        className="inline-flex items-center gap-2 rounded-full border border-white/30 px-7 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/10"
                      >
                        {slide.secondaryCtaText}
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={() => goTo(active - 1)}
        className="absolute left-4 top-1/2 z-20 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white/80 backdrop-blur transition-colors hover:bg-black/60 sm:left-6 sm:h-12 sm:w-12"
        aria-label="Previous slide"
      >
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>
      <button
        onClick={() => goTo(active + 1)}
        className="absolute right-4 top-1/2 z-20 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white/80 backdrop-blur transition-colors hover:bg-black/60 sm:right-6 sm:h-12 sm:w-12"
        aria-label="Next slide"
      >
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>

      <div className="absolute bottom-6 left-1/2 z-20 flex -translate-x-1/2 items-center gap-2">
        {slides.map((_, idx) => (
          <button
            key={idx}
            onClick={() => goTo(idx)}
            aria-label={`Go to slide ${idx + 1}`}
            className={`h-2.5 rounded-full transition-all duration-300 ${
              idx === active
                ? "w-8 bg-[var(--accent)]"
                : "w-2.5 bg-white/40 hover:bg-white/60"
            }`}
          />
        ))}
      </div>

      {!isPaused && (
        <div className="absolute bottom-0 left-0 z-20 h-1 w-full bg-white/10">
          <div
            className="h-full bg-[var(--accent)] transition-none"
            style={{
              animation: `progress ${autoPlayInterval}ms linear infinite`,
            }}
          />
          <style>{`
            @keyframes progress {
              from { width: 0%; }
              to { width: 100%; }
            }
          `}</style>
        </div>
      )}
    </section>
  );
}

/* ─── Main HeroBlock: routes to the correct layout ─────────────────────── */
export function HeroBlock({
  badge,
  heading,
  subheading,
  ctaText,
  ctaHref,
  secondaryCtaText,
  secondaryCtaHref,
  stats,
  backgroundImage,
  slides,
  autoPlayInterval = 5000,
  heroLayout,
  ctaVariant,
}: HeroProps) {
  const allSlides: HeroSlide[] =
    slides && slides.length > 0
      ? slides
      : [
          {
            badge,
            heading: heading ?? "Welcome",
            subheading: subheading ?? "",
            ctaText: ctaText ?? "Get Started",
            ctaHref: ctaHref ?? "#",
            secondaryCtaText,
            secondaryCtaHref,
            backgroundImage,
          },
        ];

  const isMultiSlide = allSlides.length > 1;
  const resolvedLayout =
    heroLayout ?? (isMultiSlide ? "carousel" : "split");

  switch (resolvedLayout) {
    case "multi-panel":
      if (allSlides.length >= 2) {
        return <MultiPanelHero slides={allSlides} ctaVariant={ctaVariant} />;
      }
      return <SplitHero slide={allSlides[0]} stats={stats} />;
    case "overlay":
      return <OverlayHero slide={allSlides[0]} stats={stats} ctaVariant={ctaVariant} />;
    case "centered":
      return <CenteredHero slide={allSlides[0]} stats={stats} />;
    case "carousel":
      if (isMultiSlide) {
        return (
          <CarouselHero
            slides={allSlides}
            autoPlayInterval={autoPlayInterval}
          />
        );
      }
      return <OverlayHero slide={allSlides[0]} stats={stats} ctaVariant={ctaVariant} />;
    case "split":
    default:
      return <SplitHero slide={allSlides[0]} stats={stats} />;
  }
}
