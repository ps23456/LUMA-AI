import type { TestimonialsProps } from "@/types/blocks";

export function TestimonialsBlock({
  heading,
  subheading,
  testimonials,
}: TestimonialsProps) {
  return (
    <section className="py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl" style={{ fontFamily: "var(--font-theme, inherit)" }}>
            {heading}
          </h2>
          <p className="mt-4 text-base opacity-60">{subheading}</p>
        </div>
        <div className="mx-auto mt-16 grid max-w-5xl grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {testimonials.map((t) => (
            <div
              key={t.name}
              className="rounded-2xl border border-current/5 bg-white/5 p-6"
            >
              <div className="mb-4 flex gap-1 text-[var(--accent)]">
                {Array.from({ length: 5 }).map((_, i) => (
                  <span key={i}>&#9733;</span>
                ))}
              </div>
              <blockquote className="text-sm leading-relaxed opacity-80">
                &ldquo;{t.quote}&rdquo;
              </blockquote>
              <div className="mt-6 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--accent)] text-sm font-bold text-white">
                  {t.avatar || t.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-semibold">{t.name}</p>
                  <p className="text-xs opacity-50">{t.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
