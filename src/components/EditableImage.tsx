"use client";

import { useState, useCallback, useEffect } from "react";
import { usePreviewEdit } from "./PreviewEditContext";

function proxyUrl(src: string): string {
  return `/api/image-proxy?url=${encodeURIComponent(src)}`;
}

function isProductPageUrl(url: string): boolean {
  try {
    const u = new URL(url);
    const path = u.pathname.toLowerCase();
    const ext = path.split(".").pop()?.toLowerCase() ?? "";
    const imageExts = ["jpg", "jpeg", "png", "gif", "webp", "avif", "svg", "bmp"];
    if (imageExts.includes(ext)) return false;
    return /\/products?\/|\/p\/|\/item\/|\/shop\/|\/product\//.test(path);
  } catch {
    return false;
  }
}

interface EditableImageProps {
  path: string;
  imageUrl?: string;
  imageQuery?: string;
  alt: string;
  placeholder?: React.ReactNode;
  className?: string;
  imgClassName?: string;
  /** Use "image" for products (schema field), "imageUrl" for split-content etc. */
  imageField?: "image" | "imageUrl";
}

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

export function EditableImage({
  path,
  imageUrl,
  imageQuery,
  alt,
  placeholder,
  className = "",
  imgClassName = "",
  imageField = "imageUrl",
}: EditableImageProps) {
  const ctx = usePreviewEdit();
  const [loadFailed, setLoadFailed] = useState(false);
  const isEmpty = !imageUrl;

  useEffect(() => {
    setLoadFailed(false);
  }, [imageUrl]);

  const handleImageError = useCallback(() => {
    if (!imageUrl || !ctx?.editable || loadFailed) return;
    if (!isProductPageUrl(imageUrl)) return;
    setLoadFailed(true);
    const q = productUrlToSearchQuery(imageUrl);
    fetch(`/api/image-search?q=${encodeURIComponent(q)}&count=1`)
      .then((r) => r.json())
      .then((data) => {
        const url = data.urls?.[0];
        if (url) ctx.onUpdate(`${path}.${imageField}`, url);
      })
      .catch(() => {});
  }, [imageUrl, ctx, path, loadFailed, imageField]);

  if (!ctx?.editable) {
    if (imageUrl) {
      return (
        <img
          src={proxyUrl(imageUrl)}
          alt={alt}
          referrerPolicy="no-referrer"
          loading="lazy"
          className={`h-full w-full object-cover ${imgClassName}`}
        />
      );
    }
    return (
      <div className={`flex items-center justify-center border-2 border-dashed border-current/30 bg-current/[0.03] ${className}`}>
        {placeholder ?? (
          <span className="text-4xl opacity-40" aria-hidden="true">&#128247;</span>
        )}
      </div>
    );
  }

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    ctx.openEditor({
      path: `${path}.${imageField}`,
      value: imageUrl ?? "",
      type: "image",
      label: "Image",
    });
  };

  const handleSearchClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    ctx.openEditor({
      path: `${path}.imageQuery`,
      value: imageQuery ?? alt,
      type: "imageQuery",
      label: "Search for image",
    });
  };

  if (imageUrl) {
    return (
      <div className="group relative">
        <img
          src={proxyUrl(imageUrl)}
          alt={alt}
          referrerPolicy="no-referrer"
          loading="lazy"
          onClick={handleClick}
          onError={ctx?.editable ? handleImageError : undefined}
          className={`cursor-pointer object-cover transition-all hover:ring-2 hover:ring-orange-500/50 ${imgClassName} ${className}`}
        />
        <button
          type="button"
          onClick={handleClick}
          className="absolute right-2 top-2 rounded-lg border border-white/30 bg-black/50 px-2.5 py-1.5 text-xs font-medium text-white/90 opacity-0 shadow-lg backdrop-blur-sm transition-opacity hover:bg-black/70 hover:text-white group-hover:opacity-100"
          aria-label="Change image"
        >
          Change image
        </button>
      </div>
    );
  }

  return (
    <div
      className={`flex cursor-pointer flex-col items-center justify-center gap-3 border-2 border-dashed border-current/40 bg-current/[0.04] transition-all hover:border-[var(--accent)]/60 hover:bg-[var(--accent)]/5 ${className}`}
    >
      {placeholder ?? (
        <span className="text-5xl opacity-50" aria-hidden="true">
          &#128247;
        </span>
      )}
      <div className="flex flex-col items-center gap-1 text-center">
        <span className="text-sm font-semibold text-current/80">Empty image slot</span>
        <span className="text-xs text-current/60">Click to add image or paste URL</span>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-2">
        <button
          type="button"
          onClick={handleClick}
          className="rounded-lg border-2 border-[var(--accent)] bg-[var(--accent)]/20 px-4 py-2 text-sm font-semibold text-[var(--accent)] transition-colors hover:bg-[var(--accent)]/30"
        >
          Add image
        </button>
        <button
          type="button"
          onClick={handleSearchClick}
          className="rounded-lg border border-current/30 bg-white/10 px-4 py-2 text-sm font-medium text-current/80 transition-colors hover:bg-white/20"
        >
          Or search for image
        </button>
      </div>
    </div>
  );
}
