"use client";

import { usePreviewEdit } from "./PreviewEditContext";
import { FONT_STACKS, parseFontSize } from "@/lib/utils/fonts";

interface EditableFieldProps {
  path: string;
  value: string;
  type: "text" | "paragraph" | "price";
  label?: string;
  children: React.ReactNode;
  className?: string;
}

export function EditableField({
  path,
  value,
  type,
  label,
  children,
  className = "",
}: EditableFieldProps) {
  const ctx = usePreviewEdit();

  const elementStyle = (ctx?.layout as { elementStyles?: Record<string, { fontFamily?: string; fontSize?: string; color?: string }> })?.elementStyles?.[path];
  const style: React.CSSProperties = {};
  if (elementStyle?.fontFamily) style.fontFamily = FONT_STACKS[elementStyle.fontFamily] ?? elementStyle.fontFamily;
  const fs = parseFontSize(elementStyle?.fontSize);
  if (fs) style.fontSize = fs;
  if (elementStyle?.color) style.color = elementStyle.color;

  if (!ctx?.editable) {
    return Object.keys(style).length > 0 ? (
      <span style={style}>{children}</span>
    ) : (
      <>{children}</>
    );
  }

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    ctx.openEditor({ path, value, type, label });
  };

  return (
    <span
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          ctx.openEditor({ path, value, type, label });
        }
      }}
      style={style}
      className={`cursor-text rounded px-0.5 py-0.5 ring-0 transition-all hover:ring-2 hover:ring-orange-500/50 hover:ring-offset-1 ${className}`}
      title={`Click to edit ${label || type}`}
    >
      {children}
    </span>
  );
}
