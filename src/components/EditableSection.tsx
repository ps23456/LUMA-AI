"use client";

import { usePreviewEdit } from "./PreviewEditContext";

interface EditableSectionProps {
  sectionIndex: number;
  backgroundColor?: string;
  children: React.ReactNode;
  className?: string;
}

export function EditableSection({
  sectionIndex,
  backgroundColor,
  children,
  className = "",
}: EditableSectionProps) {
  const ctx = usePreviewEdit();
  const prefix = `sections.${sectionIndex}.props`;

  if (!ctx?.editable) {
    return (
      <section
        className={className}
        style={backgroundColor ? { backgroundColor } : undefined}
      >
        {children}
      </section>
    );
  }

  const openBackgroundEditor = () => {
    ctx.openEditor({
      path: `${prefix}.backgroundColor`,
      value: backgroundColor ?? "",
      type: "background",
      label: "Section background",
    });
  };

  return (
    <section
      className={`group relative ${className}`}
      style={backgroundColor ? { backgroundColor } : undefined}
    >
      {children}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          openBackgroundEditor();
        }}
        className="absolute right-4 top-4 flex items-center gap-1.5 rounded-lg border border-white/30 bg-black/60 px-3 py-2 text-xs font-medium text-white/90 shadow-lg transition-all hover:border-orange-500/50 hover:bg-orange-500/30 hover:text-white"
        title="Change section background color"
      >
        <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
        </svg>
        Section bg
      </button>
    </section>
  );
}
