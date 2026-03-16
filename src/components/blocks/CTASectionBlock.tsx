import Link from "next/link";
import type { CTASectionProps } from "@/types/blocks";

export function CTASectionBlock({
  heading,
  subheading,
  ctaText,
  ctaHref,
}: CTASectionProps) {
  return (
    <section className="py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-[var(--accent)] to-[var(--accent-dark,var(--accent))] p-12 sm:p-16">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-black uppercase tracking-tight text-white sm:text-4xl" style={{ fontFamily: "var(--font-theme, inherit)" }}>
              {heading}
            </h2>
            <p className="mt-4 text-base text-white/80">{subheading}</p>
            <div className="mt-8">
              <Link
                href={ctaHref}
                className="inline-flex items-center rounded-full bg-white px-8 py-3 text-sm font-semibold text-black transition-transform hover:scale-105"
              >
                {ctaText}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
