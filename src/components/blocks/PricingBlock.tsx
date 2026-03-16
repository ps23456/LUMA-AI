import { cn } from "@/lib/utils";
import type { PricingProps } from "@/types/blocks";
import { EditableField } from "@/components/EditableField";
import { EditableSection } from "@/components/EditableSection";

export function PricingBlock({
  heading,
  subheading,
  tiers,
  editIndex,
  backgroundColor,
}: PricingProps & { editIndex?: number | null; backgroundColor?: string }) {
  const prefix = editIndex != null ? `sections.${editIndex}.props` : "";
  const content = (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl" style={{ fontFamily: "var(--font-theme, inherit)" }}>
            {prefix ? (
              <EditableField path={`${prefix}.heading`} value={heading} type="text" label="Heading">
                {heading}
              </EditableField>
            ) : (
              heading
            )}
          </h2>
          <p className="mt-4 text-base opacity-60">
            {prefix ? (
              <EditableField path={`${prefix}.subheading`} value={subheading} type="text" label="Subheading">
                {subheading}
              </EditableField>
            ) : (
              subheading
            )}
          </p>
        </div>
        <div className="mx-auto mt-16 grid max-w-5xl grid-cols-1 gap-6 lg:grid-cols-3">
          {tiers.map((tier, i) => (
            <div
              key={tier.name}
              className={cn(
                "flex flex-col rounded-2xl border p-8 backdrop-blur-sm transition-all duration-300 hover:-translate-y-1",
                tier.highlighted
                  ? "scale-105 border-[var(--accent)]/50 bg-[var(--accent)]/5 shadow-2xl shadow-[var(--accent)]/10"
                  : "border-white/10 bg-white/[0.03] hover:border-white/20 hover:shadow-lg",
              )}
            >
              <div>
                {tier.highlighted && (
                  <span className="mb-3 inline-block rounded-full bg-[var(--accent)] px-3 py-1 text-xs font-semibold uppercase text-white">
                    Popular
                  </span>
                )}
                <h3 className="text-xl font-bold">{tier.name}</h3>
                <p className="mt-1 text-sm opacity-60">{tier.description}</p>
                <p className="mt-4 text-4xl font-black">
                  {prefix ? (
                    <EditableField
                      path={`${prefix}.tiers.${i}.price`}
                      value={tier.price}
                      type="price"
                      label="Price"
                    >
                      {tier.price}
                    </EditableField>
                  ) : (
                    tier.price
                  )}
                </p>
              </div>
              <ul className="mt-8 flex-1 space-y-3">
                {tier.features.map((feature) => (
                  <li
                    key={feature}
                    className="flex items-start gap-2 text-sm opacity-80"
                  >
                    <span className="mt-0.5 text-[var(--accent)]">&#10003;</span>
                    {feature}
                  </li>
                ))}
              </ul>
              <button
                className={cn(
                  "mt-8 w-full rounded-full py-3 text-sm font-semibold transition-all duration-300 hover:scale-[1.02]",
                  tier.highlighted
                    ? "bg-[var(--accent)] text-white hover:shadow-lg hover:shadow-[var(--accent)]/25"
                    : "border border-white/20 hover:bg-white/5",
                )}
              >
                {tier.ctaText}
              </button>
            </div>
          ))}
        </div>
      </div>
  );

  return editIndex != null ? (
    <EditableSection sectionIndex={editIndex} backgroundColor={backgroundColor} className="py-20 sm:py-28">
      {content}
    </EditableSection>
  ) : (
    <section className="py-20 sm:py-28" style={backgroundColor ? { backgroundColor } : undefined}>
      {content}
    </section>
  );
}
