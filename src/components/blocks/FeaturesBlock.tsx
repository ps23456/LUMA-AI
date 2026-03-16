"use client";

import type { FeaturesProps } from "@/types/blocks";
import { EditableField } from "@/components/EditableField";
import { EditableSection } from "@/components/EditableSection";
import { usePreviewEdit } from "@/components/PreviewEditContext";

const ICON_MAP: Record<string, string> = {
  zap: "\u26A1",
  shield: "\uD83D\uDEE1\uFE0F",
  rocket: "\uD83D\uDE80",
  star: "\u2B50",
  heart: "\u2764\uFE0F",
  globe: "\uD83C\uDF0D",
  lock: "\uD83D\uDD12",
  chart: "\uD83D\uDCCA",
  clock: "\u23F0",
  check: "\u2705",
  shoe: "\uD83D\uDC5F",
  fire: "\uD83D\uDD25",
  sparkle: "\u2728",
  target: "\uD83C\uDFAF",
  bolt: "\u26A1",
  paint: "\uD83C\uDFA8",
  truck: "\uD83D\uDE9A",
  gift: "\uD83C\uDF81",
  medal: "\uD83C\uDFC5",
  crown: "\uD83D\uDC51",
};

function resolveIcon(icon: string): string {
  return ICON_MAP[icon.toLowerCase()] ?? "\u2728";
}

const HOVER_CLASSES: Record<string, string> = {
  lift: "hover:-translate-y-2 hover:shadow-xl hover:shadow-[var(--accent)]/10",
  scale: "hover:scale-[1.03] hover:shadow-xl",
  glow: "hover:shadow-[0_0_30px_var(--accent)]/30 hover:border-[var(--accent)]/50",
  bounce: "hover:-translate-y-3",
  tilt: "hover:rotate-1 hover:scale-[1.02] hover:shadow-xl",
  none: "",
};

function FeatureCard({
  feature,
  editIndex,
  cardIndex,
  hoverAnimation = "lift",
}: {
  feature: { title: string; description: string; icon?: string; backgroundColor?: string };
  editIndex: number | null | undefined;
  cardIndex: number;
  hoverAnimation?: "lift" | "scale" | "glow" | "bounce" | "tilt" | "none";
}) {
  const ctx = usePreviewEdit();
  const prefix = editIndex != null ? `sections.${editIndex}.props.features.${cardIndex}` : "";
  const cardBg = feature.backgroundColor;
  const hoverClass = HOVER_CLASSES[hoverAnimation] ?? HOVER_CLASSES.lift;

  const openCardBgEditor = () => {
    if (!ctx?.editable || !prefix) return;
    ctx.openEditor({
      path: `${prefix}.backgroundColor`,
      value: cardBg ?? "",
      type: "background",
      label: "Card background",
    });
  };

  return (
    <div
      className={`group relative rounded-2xl border border-white/10 p-6 backdrop-blur-sm transition-all duration-300 hover:border-[var(--accent)]/30 ${hoverClass}`}
      style={{
        backgroundColor: cardBg ?? "rgba(255,255,255,0.03)",
      }}
    >
      {ctx?.editable && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            openCardBgEditor();
          }}
          className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-lg border border-white/20 bg-black/40 text-white/70 opacity-0 transition-all hover:border-orange-500/50 hover:bg-orange-500/20 hover:opacity-100 group-hover:opacity-100 focus:opacity-100"
          title="Change card background"
        >
          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
          </svg>
        </button>
      )}
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--accent)]/10 text-2xl transition-transform duration-300 group-hover:scale-110">
        {resolveIcon(feature.icon ?? "sparkle")}
      </div>
      <h3 className="text-lg font-semibold">
        {ctx?.editable && prefix ? (
          <EditableField path={`${prefix}.title`} value={feature.title} type="text" label="Card title">
            {feature.title}
          </EditableField>
        ) : (
          feature.title
        )}
      </h3>
      <p className="mt-2 text-sm leading-relaxed opacity-60">
        {ctx?.editable && prefix ? (
          <EditableField path={`${prefix}.description`} value={feature.description} type="paragraph" label="Card description">
            {feature.description}
          </EditableField>
        ) : (
          feature.description
        )}
      </p>
    </div>
  );
}

export function FeaturesBlock({
  heading,
  subheading,
  features,
  hoverAnimation = "lift",
  editIndex,
  backgroundColor,
}: FeaturesProps & { editIndex?: number | null; backgroundColor?: string }) {
  const prefix = editIndex != null ? `sections.${editIndex}.props` : "";
  const content = (
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2
            className="text-3xl font-bold tracking-tight sm:text-4xl"
            style={{ fontFamily: "var(--font-theme, inherit)" }}
          >
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
        <div className="mx-auto mt-16 grid max-w-6xl grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, i) => (
            <FeatureCard
              key={`${feature.title}-${i}`}
              feature={feature}
              editIndex={editIndex}
              cardIndex={i}
              hoverAnimation={hoverAnimation}
            />
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
