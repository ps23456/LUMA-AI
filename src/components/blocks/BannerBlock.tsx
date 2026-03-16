"use client";

import { useState } from "react";
import type { BannerProps } from "@/types/blocks";

export function BannerBlock({ text, ctaText, ctaHref, dismissible }: BannerProps) {
  const [visible, setVisible] = useState(true);

  if (!visible) return null;

  return (
    <div className="relative bg-[var(--accent)] px-4 py-2.5 text-center text-sm font-medium text-white">
      <div className="mx-auto flex max-w-7xl items-center justify-center gap-3">
        <span>&#9733;</span>
        <span>{text}</span>
        {ctaText && ctaHref && (
          <a
            href={ctaHref}
            className="inline-flex items-center gap-1 rounded-full bg-white/20 px-3 py-1 text-xs font-semibold transition-colors hover:bg-white/30"
          >
            {ctaText} &rarr;
          </a>
        )}
      </div>
      {dismissible !== false && (
        <button
          onClick={() => setVisible(false)}
          className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 text-white/60 transition-colors hover:text-white"
          aria-label="Dismiss"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
}
