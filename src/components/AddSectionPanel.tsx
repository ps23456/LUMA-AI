"use client";

import { useCallback } from "react";
import { usePreviewEdit } from "./PreviewEditContext";
import type { Section } from "@/lib/schema/website-layout";

const SECTION_TEMPLATES: Array<{
  id: string;
  label: string;
  description: string;
  icon: string;
  section: Section;
}> = [
  {
    id: "split-content",
    label: "Image + Text",
    description: "One side image, one side text (About Us style)",
    icon: "▤",
    section: {
      type: "split-content",
      props: {
        heading: "Your Heading",
        subheading: "Optional subheading",
        body: "Add your content here. This section works great for About Us, company story, or feature highlights.",
        imageQuery: "professional team office",
        imagePosition: "right",
        ctaText: "Learn more",
        ctaHref: "#",
      },
    },
  },
  {
    id: "features-cards",
    label: "Feature Cards",
    description: "Job cards / feature grid with icons",
    icon: "▦",
    section: {
      type: "features",
      props: {
        heading: "Our Features",
        subheading: "What we offer",
        hoverAnimation: "lift",
        features: [
          { title: "Feature One", description: "Brief description of this feature.", icon: "star" },
          { title: "Feature Two", description: "Brief description of this feature.", icon: "rocket" },
          { title: "Feature Three", description: "Brief description of this feature.", icon: "shield" },
        ],
      },
    },
  },
  {
    id: "features-scale",
    label: "Cards (Scale on hover)",
    description: "Cards that scale up on hover",
    icon: "⬜",
    section: {
      type: "features",
      props: {
        heading: "Our Services",
        subheading: "Explore what we do",
        hoverAnimation: "scale",
        features: [
          { title: "Service One", description: "Description here.", icon: "zap" },
          { title: "Service Two", description: "Description here.", icon: "heart" },
          { title: "Service Three", description: "Description here.", icon: "globe" },
        ],
      },
    },
  },
  {
    id: "features-glow",
    label: "Cards (Glow on hover)",
    description: "Cards with accent glow effect",
    icon: "◇",
    section: {
      type: "features",
      props: {
        heading: "Why Choose Us",
        subheading: "Your benefits",
        hoverAnimation: "glow",
        features: [
          { title: "Benefit One", description: "Description here.", icon: "check" },
          { title: "Benefit Two", description: "Description here.", icon: "bolt" },
          { title: "Benefit Three", description: "Description here.", icon: "medal" },
        ],
      },
    },
  },
  {
    id: "features-bounce",
    label: "Cards (Bounce on hover)",
    description: "Playful bounce animation",
    icon: "⬆",
    section: {
      type: "features",
      props: {
        heading: "Highlights",
        subheading: "Key points",
        hoverAnimation: "bounce",
        features: [
          { title: "Point One", description: "Description here.", icon: "sparkle" },
          { title: "Point Two", description: "Description here.", icon: "target" },
          { title: "Point Three", description: "Description here.", icon: "crown" },
        ],
      },
    },
  },
  {
    id: "features-tilt",
    label: "Cards (Tilt on hover)",
    description: "3D tilt effect on hover",
    icon: "◇",
    section: {
      type: "features",
      props: {
        heading: "Our Values",
        subheading: "What we stand for",
        hoverAnimation: "tilt",
        features: [
          { title: "Value One", description: "Description here.", icon: "heart" },
          { title: "Value Two", description: "Description here.", icon: "shield" },
          { title: "Value Three", description: "Description here.", icon: "globe" },
        ],
      },
    },
  },
  {
    id: "gallery",
    label: "Single Image / Gallery",
    description: "Image grid or single image",
    icon: "🖼",
    section: {
      type: "gallery",
      props: {
        heading: "Gallery",
        subheading: "Our work",
        images: [
          { alt: "Image 1", imageQuery: "elegant photography" },
          { alt: "Image 2", imageQuery: "professional photo" },
          { alt: "Image 3", imageQuery: "creative design" },
        ],
      },
    },
  },
  {
    id: "custom",
    label: "Custom Section",
    description: "Design your own with HTML",
    icon: "✎",
    section: {
      type: "custom",
      props: {
        heading: "Custom Section",
        subheading: "Add your own content",
        html: '<div style="padding:2rem;text-align:center;background:rgba(255,255,255,0.05);border-radius:1rem;"><p style="font-size:1.125rem;opacity:0.8;">Edit this section to add your custom HTML.</p><p style="margin-top:0.5rem;font-size:0.875rem;opacity:0.5;">Use inline styles. Reference images with {{img:id}}.</p></div>',
        images: [],
      },
    },
  },
];

interface AddSectionPanelProps {
  onClose?: () => void;
}

export function AddSectionPanel({ onClose }: AddSectionPanelProps) {
  const ctx = usePreviewEdit();

  const handleAdd = useCallback(
    (template: Section) => {
      if (!ctx?.layout) return;
      const sections = [...ctx.layout.sections];
      const footerIdx = sections.findIndex((s) => s.type === "footer");
      const insertAt = footerIdx >= 0 ? footerIdx : sections.length;
      sections.splice(insertAt, 0, template);
      ctx.onUpdate("sections", sections);
      onClose?.();
    },
    [ctx, onClose],
  );

  if (!ctx?.editable) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-white">Add section</h4>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-white/50 transition-colors hover:bg-white/10 hover:text-white"
            aria-label="Close"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
      <p className="text-[10px] text-white/50">
        Choose a section type to add to the current page. It will be inserted before the footer.
      </p>
      <div className="grid gap-2">
        {SECTION_TEMPLATES.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => handleAdd(t.section)}
            className="flex items-start gap-3 rounded-xl border border-white/20 bg-white/5 p-3 text-left transition-all hover:border-orange-500/50 hover:bg-orange-500/10"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/10 text-lg">
              {t.icon}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-white">{t.label}</p>
              <p className="mt-0.5 text-[10px] text-white/50">{t.description}</p>
            </div>
            <span className="shrink-0 text-[10px] text-orange-400">+ Add</span>
          </button>
        ))}
      </div>
    </div>
  );
}
