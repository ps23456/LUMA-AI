import type { TimelineProps } from "@/types/blocks";

export function TimelineBlock({ heading, subheading, steps }: TimelineProps) {
  return (
    <section className="py-20 sm:py-28">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl" style={{ fontFamily: "var(--font-theme, inherit)" }}>
            {heading}
          </h2>
          <p className="mt-4 text-base opacity-60">{subheading}</p>
        </div>
        <div className="relative mt-16">
          {/* Vertical line */}
          <div className="absolute left-5 top-0 h-full w-px bg-gradient-to-b from-[var(--accent)] via-[var(--accent)]/30 to-transparent sm:left-1/2 sm:-translate-x-px" />

          <div className="space-y-12">
            {steps.map((step, i) => (
              <div
                key={step.title}
                className={`relative flex items-start gap-6 sm:gap-10 ${i % 2 === 0 ? "sm:flex-row" : "sm:flex-row-reverse"}`}
              >
                {/* Dot */}
                <div className="absolute left-5 z-10 flex h-10 w-10 -translate-x-1/2 items-center justify-center rounded-full border-4 border-[var(--accent)]/20 bg-[var(--accent)] text-sm font-bold text-white sm:left-1/2">
                  {i + 1}
                </div>

                {/* Content */}
                <div className={`ml-14 flex-1 rounded-2xl border border-current/5 bg-white/5 p-5 backdrop-blur sm:ml-0 ${i % 2 === 0 ? "sm:mr-auto sm:w-[calc(50%-2.5rem)]" : "sm:ml-auto sm:w-[calc(50%-2.5rem)]"}`}>
                  <h3 className="text-lg font-bold">{step.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed opacity-60">
                    {step.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
