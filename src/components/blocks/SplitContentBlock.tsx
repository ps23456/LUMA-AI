"use client";

import { useCallback, useState, useRef, useEffect } from "react";
import Link from "next/link";
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  horizontalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { EditableField } from "@/components/EditableField";
import { EditableImage } from "@/components/EditableImage";
import { EditableSection } from "@/components/EditableSection";
import { usePreviewEdit } from "@/components/PreviewEditContext";

function proxyUrl(src: string): string {
  return `/api/image-proxy?url=${encodeURIComponent(src)}`;
}

export interface SplitContentProps {
  heading: string;
  subheading?: string;
  body: string;
  imageQuery?: string;
  imageUrl?: string;
  imagePosition?: "left" | "right";
  layoutVariant?: "split" | "stacked" | "full-width";
  imageWidth?: number;
  imageHeight?: number;
  imageMaxWidth?: number;
  ctaText?: string;
  ctaHref?: string;
  editIndex?: number | null;
  backgroundColor?: string;
}

function SortableColumn({ id, children }: { id: string; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = { transform: CSS.Transform.toString(transform), transition };
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`min-w-0 ${isDragging ? "opacity-50" : ""}`}
    >
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing rounded-xl border-2 border-dashed border-transparent transition-all hover:border-orange-500/40 hover:bg-orange-500/5"
      >
        {children}
      </div>
    </div>
  );
}

export function SplitContentBlock({
  heading,
  subheading,
  body,
  imageUrl,
  imageQuery,
  imagePosition = "left",
  layoutVariant = "split",
  imageWidth = 50,
  imageHeight = 400,
  imageMaxWidth = 900,
  ctaText,
  ctaHref = "#",
  editIndex,
  backgroundColor,
}: SplitContentProps) {
  const ctx = usePreviewEdit();
  const [showToolbar, setShowToolbar] = useState(false);
  const [showEditBtn, setShowEditBtn] = useState(false);
  const toolbarRef = useRef<HTMLDivElement>(null);
  const prefix = editIndex != null ? `sections.${editIndex}.props` : "";
  const editable = editIndex != null && ctx?.editable;

  useEffect(() => {
    if (!showToolbar) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (toolbarRef.current?.contains(e.target as Node)) return;
      setShowToolbar(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showToolbar]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  const updateProp = useCallback(
    (key: string, value: unknown) => {
      if (prefix && ctx?.onUpdate) {
        ctx.onUpdate(`${prefix}.${key}`, value);
      }
    },
    [prefix, ctx],
  );

  const handleDragEnd = useCallback(
    (e: DragEndEvent) => {
      const { active, over } = e;
      if (!over || active.id === over.id) return;
      const order = [active.id, over.id].sort();
      if (order[0] === "image" && order[1] === "text") {
        const newPos = active.id === "image" ? "right" : "left";
        updateProp("imagePosition", newPos);
      }
    },
    [updateProp],
  );

  const textBlock = (
    <div className="flex flex-col justify-center">
      <h2
        className="text-3xl font-bold uppercase tracking-tight sm:text-4xl lg:text-5xl"
        style={{
          fontFamily: "var(--font-theme, inherit)",
          fontWeight: "var(--heading-weight, 700)",
          letterSpacing: "var(--heading-letter-spacing, 0.02em)",
        }}
      >
        {prefix ? (
          <EditableField path={`${prefix}.heading`} value={heading} type="text" label="Heading">
            {heading}
          </EditableField>
        ) : (
          heading
        )}
      </h2>
      {subheading && (
        <p className="mt-4 text-base font-medium opacity-70">
          {prefix ? (
            <EditableField path={`${prefix}.subheading`} value={subheading} type="text" label="Subheading">
              {subheading}
            </EditableField>
          ) : (
            subheading
          )}
        </p>
      )}
      <div className="mt-6 space-y-4 text-base leading-relaxed opacity-80">
        {body.split("\n\n").map((para, i) => (
          <p key={i}>
            {prefix ? (
              <EditableField path={`${prefix}.body`} value={body} type="paragraph" label="Paragraph">
                {para}
              </EditableField>
            ) : (
              para
            )}
          </p>
        ))}
      </div>
      {ctaText && ctaHref && (
        <Link
          href={ctaHref}
          className="mt-8 inline-flex w-fit items-center gap-2 rounded-full border-2 border-current px-8 py-3.5 text-sm font-semibold uppercase tracking-wider transition-all hover:bg-[var(--accent)] hover:border-[var(--accent)] hover:text-white"
        >
          {ctaText}
          <span>&rarr;</span>
        </Link>
      )}
    </div>
  );

  const hasExplicitHeight = imageHeight != null && imageHeight > 0;
  const imgAspect = hasExplicitHeight ? undefined : layoutVariant === "split" ? "4/5" : "16/9";
  const imageBlock = (
    <div
      className="relative overflow-hidden rounded-2xl"
      style={{
        ...(imgAspect ? { aspectRatio: imgAspect } : {}),
        ...(hasExplicitHeight ? { minHeight: imageHeight, height: imageHeight } : {}),
        ...((layoutVariant === "stacked" || layoutVariant === "full-width") && imageMaxWidth
          ? { maxWidth: imageMaxWidth, width: "100%", marginLeft: "auto", marginRight: "auto" }
          : {}),
      }}
    >
      {prefix ? (
        <EditableImage
          path={prefix}
          imageUrl={imageUrl}
          imageQuery={imageQuery}
          alt={heading}
          className="absolute inset-0 h-full w-full"
          imgClassName="absolute inset-0 h-full w-full object-cover"
        />
      ) : imageUrl ? (
        <img
          src={proxyUrl(imageUrl)}
          alt={heading}
          referrerPolicy="no-referrer"
          loading="lazy"
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : (
        <div className="flex h-full items-center justify-center bg-gradient-to-br from-[var(--accent)]/15 to-[var(--accent)]/5 text-6xl opacity-40">
          &#9733;
        </div>
      )}
    </div>
  );

  const order = imagePosition === "left" ? ["image", "text"] : ["text", "image"];

  let sectionContent: React.ReactNode;

  if (layoutVariant === "stacked") {
    sectionContent = (
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-12">
          <div className="w-full">{imageBlock}</div>
          <div className="flex flex-col justify-center">{textBlock}</div>
        </div>
      </div>
    );
  } else if (layoutVariant === "full-width") {
    sectionContent = (
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-[1fr_400px] lg:items-start">
          <div className="w-full">{imageBlock}</div>
          <div className="flex flex-col justify-center">{textBlock}</div>
        </div>
      </div>
    );
  } else {
    const colWidths =
      imageWidth != null && imageWidth > 0 && imageWidth < 100
        ? { gridTemplateColumns: `${imageWidth}fr ${100 - imageWidth}fr` }
        : undefined;
    const gridContent = editable ? (
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={order} strategy={horizontalListSortingStrategy}>
          <div
            className="grid grid-cols-1 gap-12 lg:grid-cols-2 lg:items-center lg:gap-16"
            style={colWidths}
          >
            {order.map((id) =>
              id === "image" ? (
                <SortableColumn key="image" id="image">
                  {imageBlock}
                </SortableColumn>
              ) : (
                <SortableColumn key="text" id="text">
                  {textBlock}
                </SortableColumn>
              ),
            )}
          </div>
        </SortableContext>
      </DndContext>
    ) : (
      <div
        className="grid grid-cols-1 gap-12 lg:grid-cols-2 lg:items-center lg:gap-16"
        style={colWidths}
      >
        {imagePosition === "left" ? (
          <>
            {imageBlock}
            {textBlock}
          </>
        ) : (
          <>
            {textBlock}
            {imageBlock}
          </>
        )}
      </div>
    );
    sectionContent = (
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">{gridContent}</div>
    );
  }

  const section = (
    <div
      className="relative"
      onMouseEnter={() => editable && setShowEditBtn(true)}
      onMouseLeave={() => editable && !showToolbar && setShowEditBtn(false)}
    >
      {sectionContent}
      {editable && showEditBtn && !showToolbar && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setShowToolbar(true);
          }}
          className="absolute -top-2 left-1/2 z-30 -translate-x-1/2 rounded-lg border border-white/20 bg-[#1a1a1a] px-3 py-1.5 text-xs font-medium text-white/90 shadow-lg transition-colors hover:border-orange-500/50 hover:bg-orange-500/20 hover:text-orange-400"
        >
          Edit section
        </button>
      )}
      {editable && showToolbar && (
        <div ref={toolbarRef} className="absolute -top-2 left-1/2 z-40 -translate-x-1/2 rounded-xl border border-white/20 bg-[#1a1a1a] px-3 py-2 shadow-xl">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-[10px] font-medium uppercase text-white/60">Layout</span>
            <select
              value={layoutVariant}
              onChange={(e) => updateProp("layoutVariant", e.target.value)}
              className="rounded border border-white/20 bg-white/10 px-2 py-1 text-xs text-white"
            >
              <option value="split">Split (drag to swap)</option>
              <option value="stacked">Stacked (image top)</option>
              <option value="full-width">Full width + text</option>
            </select>
            {layoutVariant === "split" && (
              <>
                <span className="text-[10px] text-white/50">Column ratio %</span>
                <input
                  type="range"
                  min={30}
                  max={70}
                  value={imageWidth ?? 50}
                  onChange={(e) => updateProp("imageWidth", parseInt(e.target.value, 10))}
                  className="w-20"
                />
                <span className="text-[10px] text-white/70">{imageWidth ?? 50}%</span>
              </>
            )}
            {(layoutVariant === "stacked" || layoutVariant === "full-width") && (
              <>
                <span className="text-[10px] text-white/50">Width (px)</span>
                <input
                  type="number"
                  min={300}
                  max={1400}
                  value={imageMaxWidth ?? 900}
                  onChange={(e) => updateProp("imageMaxWidth", parseInt(e.target.value, 10) || 900)}
                  className="w-16 rounded border border-white/20 bg-white/10 px-1.5 py-0.5 text-xs text-white"
                />
              </>
            )}
            <span className="text-[10px] text-white/50">Height (px)</span>
            <input
              type="number"
              min={150}
              max={800}
              value={imageHeight ?? 400}
              onChange={(e) => updateProp("imageHeight", parseInt(e.target.value, 10) || 400)}
              className="w-16 rounded border border-white/20 bg-white/10 px-1.5 py-0.5 text-xs text-white"
            />
            <button
              type="button"
              onClick={() => setShowToolbar(false)}
              className="rounded p-1 text-white/50 transition-colors hover:bg-white/10 hover:text-white"
              aria-label="Close"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );

  return editIndex != null ? (
    <EditableSection sectionIndex={editIndex} backgroundColor={backgroundColor} className="py-20 sm:py-28 lg:py-36">
      {section}
    </EditableSection>
  ) : (
    <section className="py-20 sm:py-28 lg:py-36" style={backgroundColor ? { backgroundColor } : undefined}>
      {section}
    </section>
  );
}
