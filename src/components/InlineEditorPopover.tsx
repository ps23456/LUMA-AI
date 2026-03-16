"use client";

import { useState, useEffect, useRef } from "react";
import { usePreviewEdit } from "./PreviewEditContext";
import {
  FONT_OPTIONS,
  FONT_SIZE_PRESETS,
  MIN_FONT_SIZE,
  MAX_FONT_SIZE,
} from "@/lib/utils/fonts";

const IMAGE_EXTS = ["jpg", "jpeg", "png", "gif", "webp", "avif", "svg", "bmp"];

/** Detect if URL is a product/page URL (not a direct image). */
function isProductPageUrl(url: string): boolean {
  try {
    const u = new URL(url);
    const path = u.pathname.toLowerCase();
    const ext = path.split(".").pop()?.toLowerCase() ?? "";
    if (IMAGE_EXTS.includes(ext)) return false;
    return /\/products?\/|\/p\/|\/item\/|\/shop\/|\/product\//.test(path) || path.split("/").filter(Boolean).length >= 2;
  } catch {
    return false;
  }
}

/** Detect if string looks like a direct image URL. */
function isDirectImageUrl(s: string): boolean {
  try {
    const u = new URL(s);
    const path = u.pathname.toLowerCase();
    const ext = path.split(".").pop()?.toLowerCase() ?? "";
    return IMAGE_EXTS.includes(ext);
  } catch {
    return false;
  }
}

/** Extract search query from product page URL path. */
function productUrlToSearchQuery(url: string): string {
  try {
    const u = new URL(url);
    const segments = u.pathname.split("/").filter(Boolean);
    const last = segments[segments.length - 1] ?? "";
    const slug = last.replace(/[?#].*$/, "").replace(/-/g, " ");
    return slug ? `${slug} flowers product` : "flower bouquet";
  } catch {
    return "flower bouquet";
  }
}

const PRESET_COLORS = [
  "#0a0a0a", "#ffffff", "#f8fafc", "#f1f5f9", "#e2e8f0",
  "#f97316", "#ef4444", "#22c55e", "#3b82f6", "#8b5cf6",
  "#ec4899", "#f59e0b", "#14b8a6", "#6366f1", "#64748b",
];

export function InlineEditorPopover() {
  const ctx = usePreviewEdit();
  const [localValue, setLocalValue] = useState("");
  const [searching, setSearching] = useState(false);
  const [styleFont, setStyleFont] = useState("");
  const [styleSize, setStyleSize] = useState("");
  const [styleColor, setStyleColor] = useState("");
  const [showBg, setShowBg] = useState(false);
  const [sectionBg, setSectionBg] = useState("");
  const inputRef = useRef<HTMLTextAreaElement | HTMLInputElement | HTMLSelectElement>(null);

  const path = ctx?.editorState?.path ?? "";
  const type = ctx?.editorState?.type ?? "text";
  const label = ctx?.editorState?.label;
  const updateTarget = ctx?.editorState?.updateTarget;
  const doUpdate = updateTarget === "home" && ctx?.onUpdateHome ? ctx.onUpdateHome : ctx?.onUpdate;

  useEffect(() => {
    if (ctx?.editorState?.open) {
      setLocalValue(ctx.editorState.value);
      setSearching(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [ctx?.editorState?.open, ctx?.editorState?.value]);

  const elementStyle = (ctx?.layout as { elementStyles?: Record<string, { fontFamily?: string; fontSize?: string; color?: string }> })?.elementStyles?.[path] ?? {};
  const esFont = elementStyle.fontFamily ?? "";
  const esSizeRaw = elementStyle.fontSize ?? "";
  const esSize = ["small", "medium", "large"].includes(esSizeRaw)
    ? (esSizeRaw === "small" ? "14" : esSizeRaw === "medium" ? "16" : "20")
    : esSizeRaw;
  const esColor = elementStyle.color ?? "";
  useEffect(() => {
    setStyleFont(esFont);
    setStyleSize(esSize);
    setStyleColor(esColor);
  }, [path, esFont, esSize, esColor]);

  const sectionMatch = path.match(/^sections\.(\d+)\./);
  const sectionIndex = sectionMatch ? parseInt(sectionMatch[1], 10) : -1;
  const sectionBgPath = sectionIndex >= 0 ? `sections.${sectionIndex}.props.backgroundColor` : null;
  const layoutForSection = updateTarget === "home" && ctx?.layoutForTheme ? ctx.layoutForTheme : ctx?.layout;
  const currentSectionBg = sectionBgPath && layoutForSection
    ? (layoutForSection as { sections?: Array<{ props?: { backgroundColor?: string } }> }).sections?.[sectionIndex]?.props?.backgroundColor ?? ""
    : "";
  useEffect(() => {
    if (sectionBgPath && layoutForSection) setSectionBg(currentSectionBg);
  }, [sectionBgPath, currentSectionBg, layoutForSection]);

  if (!ctx?.editorState?.open || !ctx.editorState.path) return null;

  const handleSave = async () => {
    if (isImage && localValue.trim()) {
      if (isProductPageUrl(localValue.trim())) {
        setSearching(true);
        try {
          const q = productUrlToSearchQuery(localValue.trim());
          const res = await fetch(`/api/image-search?q=${encodeURIComponent(q)}&count=1`);
          const data = await res.json();
          const url = data.urls?.[0];
          if (url && doUpdate) {
            doUpdate(path, url);
            ctx.closeEditor();
            return;
          }
        } catch {
          // fall through to save raw URL
        } finally {
          setSearching(false);
        }
      }
    }
    if (doUpdate) doUpdate(path, localValue);
    ctx.closeEditor();
  };

  const handleSearchImage = async () => {
    if (!localValue.trim()) return;
    setSearching(true);
    try {
      const q = isProductPageUrl(localValue.trim())
        ? productUrlToSearchQuery(localValue.trim())
        : localValue.trim();
      const res = await fetch(`/api/image-search?q=${encodeURIComponent(q)}&count=1`);
      const data = await res.json();
      const url = data.urls?.[0];
      if (url && doUpdate) {
        let imageField = "imageUrl";
        if (path.includes(".products.")) {
          imageField = "image";
        } else if (path.includes(".images.")) {
          const sectionMatch = path.match(/^sections\.(\d+)\./);
          const sectionIndex = sectionMatch ? parseInt(sectionMatch[1], 10) : -1;
          const section = sectionIndex >= 0 && ctx?.layout?.sections?.[sectionIndex] ? ctx.layout.sections[sectionIndex] : null;
          imageField = section?.type === "custom" ? "url" : "src";
        }
        const imagePath = path.replace(/\.imageQuery$/, `.${imageField}`);
        doUpdate(imagePath, url);
        if (path.endsWith(".imageQuery")) doUpdate(path, localValue.trim());
        ctx.closeEditor();
      }
    } catch {
      // ignore
    } finally {
      setSearching(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") ctx.closeEditor();
    if (e.key === "Enter" && !["paragraph", "image", "imageQuery", "background"].includes(type) && !e.shiftKey) {
      e.preventDefault();
      handleSave();
    }
  };

  const isParagraph = type === "paragraph";
  const isImage = type === "image";
  const isImageQuery = type === "imageQuery";
  const isBackground = type === "background";
  const isTextEdit = type === "text" || type === "paragraph" || type === "price";

  const applyStyleUpdate = (updates: { fontFamily?: string; fontSize?: string; color?: string }) => {
    const layoutForStyles = updateTarget === "home" && ctx?.layoutForTheme ? ctx.layoutForTheme : ctx?.layout;
    const styles = { ...((layoutForStyles as { elementStyles?: Record<string, unknown> })?.elementStyles ?? {}) };
    const current = (styles[path] as Record<string, string> | undefined) ?? {};
    const merged = { ...current, ...updates };
    const filtered = Object.fromEntries(Object.entries(merged).filter(([, v]) => v != null && v !== ""));
    if (Object.keys(filtered).length === 0) {
      delete styles[path];
    } else {
      styles[path] = filtered;
    }
    const updateFn = updateTarget === "home" && ctx?.onUpdateHome ? ctx.onUpdateHome : ctx?.onUpdate;
    if (updateFn) updateFn("elementStyles", styles);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
      <div
        className="w-full max-w-md rounded-xl border border-white/10 bg-[#1a1a1a] p-4 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="mb-3 text-xs font-medium uppercase tracking-wider text-white/50">
          {label || (type === "price" ? "Price" : type === "paragraph" ? "Paragraph" : type === "image" ? "Image URL" : type === "imageQuery" ? "Search for image" : type === "background" ? "Background color" : "Text")}
        </p>

        {isBackground ? (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => {
                    if (doUpdate) doUpdate(path, c);
                    ctx.closeEditor();
                  }}
                  className="h-10 w-10 rounded-lg border-2 border-white/10 transition-all hover:scale-110"
                  style={{ backgroundColor: c }}
                  title={c}
                />
              ))}
            </div>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={localValue || "#ffffff"}
                onChange={(e) => setLocalValue(e.target.value)}
                className="h-10 w-10 cursor-pointer rounded-lg border-0 bg-transparent"
              />
              <input
                type="text"
                value={localValue}
                onChange={(e) => setLocalValue(e.target.value)}
                placeholder="#ffffff"
                className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
              />
            </div>
          </div>
        ) : isImage || isImageQuery ? (
          <div className="space-y-3">
            <input
              ref={inputRef as React.RefObject<HTMLInputElement>}
              type="text"
              value={localValue}
              onChange={(e) => setLocalValue(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/30 outline-none focus:border-orange-500"
              placeholder={isImageQuery ? "e.g. elegant flower bouquet" : "Paste image URL or product page link (e.g. themaevastore.com/products/rose-rogue-bouquet)"}
            />
            {!isDirectImageUrl(localValue.trim()) && (
              <button
                type="button"
                onClick={handleSearchImage}
                disabled={searching || !localValue.trim()}
                className="w-full rounded-lg bg-orange-500 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                {searching ? "Searching..." : isProductPageUrl(localValue.trim()) ? "Fetch image from link" : "Search & apply"}
              </button>
            )}
          </div>
        ) : isParagraph ? (
          <textarea
            ref={inputRef as React.RefObject<HTMLTextAreaElement>}
            value={localValue}
            onChange={(e) => setLocalValue(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={5}
            className="w-full resize-none rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/30 outline-none focus:border-orange-500"
            placeholder="Enter text..."
          />
        ) : (
          <input
            ref={inputRef as React.RefObject<HTMLInputElement>}
            type="text"
            value={localValue}
            onChange={(e) => setLocalValue(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/30 outline-none focus:border-orange-500"
            placeholder={type === "price" ? "e.g. ₹999 or $29" : "Enter text..."}
          />
        )}

        {isTextEdit && (
          <div className="mt-3 space-y-3 rounded-lg border border-white/10 bg-white/5 p-3">
            <p className="text-xs font-medium text-white/70">Style</p>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="w-14 shrink-0 text-xs text-white/50">Font</span>
                <select
                  value={styleFont || "Inter"}
                  onChange={(e) => {
                    const v = e.target.value;
                    setStyleFont(v);
                    applyStyleUpdate({ fontFamily: v });
                  }}
                  className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-orange-500/50"
                >
                  {FONT_OPTIONS.map((f) => (
                    <option key={f.value} value={f.value} className="bg-[#1a1a1a] text-white">
                      {f.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-14 shrink-0 text-xs text-white/50">Size</span>
                <div className="flex flex-1 items-center gap-0 overflow-hidden rounded-lg border border-white/10 bg-white/5">
                  <button
                    type="button"
                    onClick={() => {
                      const n = Math.max(MIN_FONT_SIZE, parseInt(styleSize || "16", 10) - 1);
                      const v = String(n);
                      setStyleSize(v);
                      applyStyleUpdate({ fontSize: v });
                    }}
                    className="flex h-9 w-9 shrink-0 items-center justify-center text-white/70 transition-colors hover:bg-white/10 hover:text-white"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                    </svg>
                  </button>
                  <input
                    type="number"
                    min={MIN_FONT_SIZE}
                    max={MAX_FONT_SIZE}
                    value={styleSize || "16"}
                    onChange={(e) => {
                      const v = e.target.value;
                      const n = v === "" ? 16 : Math.min(MAX_FONT_SIZE, Math.max(MIN_FONT_SIZE, parseInt(v, 10) || 16));
                      const s = String(n);
                      setStyleSize(s);
                      applyStyleUpdate({ fontSize: s });
                    }}
                    className="h-9 w-full min-w-0 flex-1 border-0 border-x border-white/10 bg-transparent px-2 text-center text-sm text-white outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const n = Math.min(MAX_FONT_SIZE, parseInt(styleSize || "16", 10) + 1);
                      const v = String(n);
                      setStyleSize(v);
                      applyStyleUpdate({ fontSize: v });
                    }}
                    className="flex h-9 w-9 shrink-0 items-center justify-center text-white/70 transition-colors hover:bg-white/10 hover:text-white"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  </button>
                </div>
                <span className="shrink-0 text-xs text-white/40">px</span>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="w-14 shrink-0 text-xs text-white/40">Presets</span>
                {FONT_SIZE_PRESETS.map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => {
                      const v = String(n);
                      setStyleSize(v);
                      applyStyleUpdate({ fontSize: v });
                    }}
                    className={`rounded-md px-2 py-1 text-xs transition-colors ${styleSize === String(n) ? "bg-orange-500 text-white" : "bg-white/10 text-white/60 hover:bg-white/15 hover:text-white/80"}`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-white/50">Color:</span>
              {PRESET_COLORS.slice(0, 8).map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => {
                    setStyleColor(c);
                    applyStyleUpdate({ color: c });
                  }}
                  className={`h-6 w-6 rounded border-2 transition-all ${styleColor === c ? "border-orange-500 scale-110" : "border-white/20 hover:border-white/40"}`}
                  style={{ backgroundColor: c }}
                  title={c}
                />
              ))}
              <input
                type="color"
                value={styleColor || "#000000"}
                onChange={(e) => {
                  setStyleColor(e.target.value);
                  applyStyleUpdate({ color: e.target.value });
                }}
                className="h-6 w-6 cursor-pointer rounded border border-white/20 bg-transparent"
              />
            </div>
            {sectionBgPath && (
              <>
                <button
                  type="button"
                  onClick={() => setShowBg((b) => !b)}
                  className="flex items-center gap-1.5 text-xs text-white/60 hover:text-white/80"
                >
                  {showBg ? "▼" : "▶"} Section background
                </button>
                {showBg && (
                  <div className="flex flex-wrap items-center gap-2 pl-2">
                    {PRESET_COLORS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => {
                          setSectionBg(c);
                          if (doUpdate && sectionBgPath) doUpdate(sectionBgPath, c);
                        }}
                        className={`h-7 w-7 rounded border-2 transition-all ${sectionBg === c ? "border-orange-500 scale-110" : "border-white/20 hover:border-white/40"}`}
                        style={{ backgroundColor: c }}
                        title={c}
                      />
                    ))}
                    <input
                      type="color"
                      value={sectionBg || "#ffffff"}
                      onChange={(e) => {
                        setSectionBg(e.target.value);
                        if (doUpdate && sectionBgPath) doUpdate(sectionBgPath, e.target.value);
                      }}
                      className="h-7 w-7 cursor-pointer rounded border border-white/20 bg-transparent"
                    />
                  </div>
                )}
              </>
            )}
          </div>
        )}

        <div className="mt-4 flex justify-end gap-2">
          <button
            onClick={() => ctx.closeEditor()}
            className="rounded-lg px-4 py-2 text-sm text-white/60 transition-colors hover:text-white"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={(isImageQuery && searching) || (isBackground && !localValue)}
            className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-orange-600 disabled:opacity-50"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
