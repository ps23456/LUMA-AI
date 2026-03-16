"use client";

import { useCallback, useState } from "react";
import type { Section, WebsiteLayout } from "@/lib/schema/website-layout";
import {
  weightToCss,
  letterSpacingToCss,
  type TypographyWeight,
  type TypographyLetterSpacing,
} from "@/lib/utils/typography";
import { toFontStack, parseFontSize } from "@/lib/utils/fonts";
import {
  NavbarBlock,
  HeroBlock,
  SplitContentBlock,
  FeaturesBlock,
  PricingBlock,
  TestimonialsBlock,
  CTASectionBlock,
  ProductGridBlock,
  NewsletterBlock,
  StatsBlock,
  FooterBlock,
  FAQBlock,
  LogoCloudBlock,
  GalleryBlock,
  TeamBlock,
  BannerBlock,
  ContactBlock,
  TimelineBlock,
  VideoBlock,
  CustomBlock,
} from "@/components/blocks";
import { AnimateOnScroll } from "@/components/AnimateOnScroll";
import { InlineEditorPopover } from "@/components/InlineEditorPopover";
import { usePreviewEdit } from "@/components/PreviewEditContext";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { JSX, CSSProperties } from "react";

interface DynamicPageProps {
  layout: WebsiteLayout;
  onNavigate?: (href: string) => void;
  editable?: boolean;
  editLayout?: WebsiteLayout;
  sectionEditIndices?: (number | null)[];
  onLayoutChange?: (layout: WebsiteLayout) => void;
}

const SECTION_LABELS: Record<string, string> = {
  navbar: "Header",
  banner: "Banner",
  hero: "Hero",
  "split-content": "Split content",
  features: "Features",
  pricing: "Pricing",
  testimonials: "Testimonials",
  cta: "CTA",
  "product-grid": "Products",
  newsletter: "Newsletter",
  stats: "Stats",
  faq: "FAQ",
  "logo-cloud": "Logo cloud",
  gallery: "Gallery",
  team: "Team",
  contact: "Contact",
  timeline: "Timeline",
  video: "Video",
  footer: "Footer",
  custom: "Custom",
};

function renderSection(
  section: Section,
  index: number,
  onNavigate?: (href: string) => void,
  editIndex?: number | null,
): JSX.Element | null {
  const key = `${section.type}-${index}`;

  switch (section.type) {
    case "navbar":
      return (
        <NavbarBlock key={key} {...section.props} onNavigate={onNavigate} />
      );
    case "banner":
      return <BannerBlock key={key} {...section.props} />;
    case "hero":
      return (
        <AnimateOnScroll key={key} variant="fadeIn">
          <HeroBlock {...section.props} />
        </AnimateOnScroll>
      );
    case "split-content":
      return (
        <AnimateOnScroll key={key} variant="fadeUp">
          <SplitContentBlock {...section.props} editIndex={editIndex} />
        </AnimateOnScroll>
      );
    case "features":
      return (
        <AnimateOnScroll key={key} variant="fadeUp">
          <FeaturesBlock {...section.props} editIndex={editIndex} />
        </AnimateOnScroll>
      );
    case "pricing":
      return (
        <AnimateOnScroll key={key} variant="fadeUp">
          <PricingBlock {...section.props} editIndex={editIndex} />
        </AnimateOnScroll>
      );
    case "testimonials":
      return (
        <AnimateOnScroll key={key} variant="fadeUp">
          <TestimonialsBlock {...section.props} />
        </AnimateOnScroll>
      );
    case "cta":
      return (
        <AnimateOnScroll key={key} variant="scaleUp">
          <CTASectionBlock {...section.props} />
        </AnimateOnScroll>
      );
    case "product-grid":
      return (
        <AnimateOnScroll key={key} variant="fadeUp">
          <ProductGridBlock {...section.props} editIndex={editIndex} />
        </AnimateOnScroll>
      );
    case "newsletter":
      return (
        <AnimateOnScroll key={key} variant="fadeUp">
          <NewsletterBlock {...section.props} />
        </AnimateOnScroll>
      );
    case "stats":
      return (
        <AnimateOnScroll key={key} variant="fadeIn">
          <StatsBlock {...section.props} />
        </AnimateOnScroll>
      );
    case "faq":
      return (
        <AnimateOnScroll key={key} variant="fadeUp">
          <FAQBlock {...section.props} />
        </AnimateOnScroll>
      );
    case "logo-cloud":
      return (
        <AnimateOnScroll key={key} variant="fadeIn">
          <LogoCloudBlock {...section.props} />
        </AnimateOnScroll>
      );
    case "gallery":
      return (
        <AnimateOnScroll key={key} variant="fadeUp">
          <GalleryBlock {...section.props} />
        </AnimateOnScroll>
      );
    case "team":
      return (
        <AnimateOnScroll key={key} variant="fadeUp">
          <TeamBlock {...section.props} />
        </AnimateOnScroll>
      );
    case "contact":
      return (
        <AnimateOnScroll key={key} variant="slideLeft">
          <ContactBlock {...section.props} />
        </AnimateOnScroll>
      );
    case "timeline":
      return (
        <AnimateOnScroll key={key} variant="fadeUp">
          <TimelineBlock {...section.props} />
        </AnimateOnScroll>
      );
    case "video":
      return (
        <AnimateOnScroll key={key} variant="scaleUp">
          <VideoBlock {...section.props} />
        </AnimateOnScroll>
      );
    case "footer":
      return <FooterBlock key={key} {...section.props} />;
    case "custom":
      return (
        <AnimateOnScroll key={key} variant="fadeUp">
          <CustomBlock {...section.props} />
        </AnimateOnScroll>
      );
    default:
      return null;
  }
}

function SortableSectionWrapper({
  id,
  section,
  index,
  onNavigate,
  editIndex,
  onRemoveSection,
  children,
}: {
  id: string;
  section: Section;
  index: number;
  onNavigate?: (href: string) => void;
  editIndex: number | null;
  onRemoveSection?: (editIndex: number) => void;
  children: JSX.Element;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const label = SECTION_LABELS[section.type] ?? section.type;
  const canRemove = editIndex !== null && onRemoveSection != null;

  return (
    <div ref={setNodeRef} style={style} className={isDragging ? "opacity-50" : ""}>
      <div className="group/section relative">
        <div
          {...attributes}
          {...listeners}
          className="absolute left-2 top-1/2 z-50 flex h-8 w-8 -translate-y-1/2 cursor-grab items-center justify-center rounded-lg border border-white/20 bg-[#1a1a1a] text-white/60 opacity-0 shadow-lg transition-all hover:border-orange-500/50 hover:bg-orange-500/20 hover:text-orange-400 group-hover/section:opacity-100 active:cursor-grabbing"
          title={`Drag to reorder — ${label}`}
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
          </svg>
        </div>
        {canRemove && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onRemoveSection(editIndex!);
            }}
            className="absolute right-2 top-1/2 z-50 flex h-8 w-8 -translate-y-1/2 cursor-pointer items-center justify-center rounded-lg border border-white/20 bg-[#1a1a1a] text-white/60 opacity-0 shadow-lg transition-all hover:border-red-500/50 hover:bg-red-500/20 hover:text-red-400 group-hover/section:opacity-100"
            title={`Remove ${label}`}
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        )}
        {children}
      </div>
    </div>
  );
}

export function DynamicPage({
  layout,
  onNavigate,
  editable = false,
  editLayout,
  sectionEditIndices = [],
  onLayoutChange,
}: DynamicPageProps) {
  const ctx = usePreviewEdit();
  const { theme } = layout;
  const effectiveEditLayout = editLayout ?? layout;

  const fontStack = toFontStack(theme.fontFamily);
  const logoFontStack = toFontStack((theme as { logoFontFamily?: string }).logoFontFamily) || fontStack;
  const headingSize = parseFontSize((theme as { headingFontSize?: string }).headingFontSize) ?? "1.5rem";
  const bodySize = parseFontSize((theme as { bodyFontSize?: string }).bodyFontSize) ?? "1rem";

  const [activeSection, setActiveSection] = useState<{ section: Section; index: number } | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  const handleDragStart = useCallback(
    (e: DragStartEvent) => {
      const index = layout.sections.findIndex((_, i) => String(i) === e.active.id);
      if (index >= 0) setActiveSection({ section: layout.sections[index], index });
    },
    [layout.sections],
  );

  const handleDragEnd = useCallback(
    (e: DragEndEvent) => {
      setActiveSection(null);
      const { active, over } = e;
      if (!over || active.id === over.id || !ctx) return;
      const oldIndex = layout.sections.findIndex((_, i) => String(i) === active.id);
      const newIndex = layout.sections.findIndex((_, i) => String(i) === over.id);
      if (oldIndex < 0 || newIndex < 0 || oldIndex === newIndex) return;
      const reordered = arrayMove([...layout.sections], oldIndex, newIndex);
      ctx.onUpdate("sections", reordered);
    },
    [layout.sections, ctx],
  );

  const handleDragCancel = useCallback(() => setActiveSection(null), []);

  const handleRemoveSection = useCallback(
    (editIndex: number) => {
      if (!ctx) return;
      const sections = [...ctx.layout.sections];
      sections.splice(editIndex, 1);
      ctx.onUpdate("sections", sections);
    },
    [ctx],
  );

  const themeStyles: CSSProperties & Record<string, string> = {
    "--accent": theme.accentColor,
    "--accent-dark": darkenColor(theme.accentColor),
    "--font-theme": fontStack,
    "--font-logo": logoFontStack,
    "--logo-weight": weightToCss(theme.logoWeight as TypographyWeight | undefined),
    "--logo-letter-spacing": letterSpacingToCss(
      theme.logoLetterSpacing as TypographyLetterSpacing | undefined,
    ),
    "--heading-weight": weightToCss(
      theme.headingWeight as TypographyWeight | undefined,
    ),
    "--heading-letter-spacing": letterSpacingToCss(
      theme.headingLetterSpacing as TypographyLetterSpacing | undefined,
    ),
    "--nav-weight": weightToCss(theme.navWeight as TypographyWeight | undefined),
    "--nav-letter-spacing": letterSpacingToCss(
      theme.navLetterSpacing as TypographyLetterSpacing | undefined,
    ),
    "--heading-size": headingSize,
    "--body-size": bodySize,
    backgroundColor: (theme as { backgroundColor?: string }).backgroundColor ?? (theme.mode === "dark" ? "#0a0a0a" : "#ffffff"),
    color: (theme as { textColor?: string }).textColor ?? (theme.mode === "dark" ? "#f5f5f5" : "#0a0a0a"),
    fontFamily: fontStack,
  };

  const sectionIds = layout.sections.map((_, i) => String(i));

  const content = (
    <div className={`min-h-screen ${editable && ctx ? "pl-10" : ""}`} data-theme-preview style={themeStyles}>
      {editable && ctx ? (
        <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
          <SortableContext items={sectionIds} strategy={verticalListSortingStrategy}>
            {layout.sections.map((section, index) => {
              const rendered = renderSection(
                section,
                index,
                onNavigate,
                sectionEditIndices[index] ?? index,
              );
              if (!rendered) return null;
              const editIdx = sectionEditIndices[index];
              return (
                <SortableSectionWrapper
                  key={`${section.type}-${index}`}
                  id={String(index)}
                  section={section}
                  index={index}
                  onNavigate={onNavigate}
                  editIndex={editIdx ?? index}
                  onRemoveSection={editIdx !== null && editIdx !== undefined ? handleRemoveSection : undefined}
                >
                  {rendered}
                </SortableSectionWrapper>
              );
            })}
          </SortableContext>
          <DragOverlay>
            {activeSection ? (
              <div className="rounded-lg border-2 border-orange-500/60 bg-[#1a1a1a] px-4 py-2 shadow-xl">
                <span className="text-sm font-medium text-white">
                  {SECTION_LABELS[activeSection.section.type] ?? activeSection.section.type}
                </span>
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      ) : (
        layout.sections.map((section, index) =>
          renderSection(
            section,
            index,
            onNavigate,
            sectionEditIndices[index] ?? index,
          ),
        )
      )}
    </div>
  );

  if (editable) {
    return (
      <>
        {content}
        <InlineEditorPopover />
      </>
    );
  }

  return content;
}

function darkenColor(hex: string): string {
  try {
    const clean = hex.replace("#", "");
    const r = Math.max(0, parseInt(clean.slice(0, 2), 16) - 30);
    const g = Math.max(0, parseInt(clean.slice(2, 4), 16) - 30);
    const b = Math.max(0, parseInt(clean.slice(4, 6), 16) - 30);
    return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
  } catch {
    return hex;
  }
}
