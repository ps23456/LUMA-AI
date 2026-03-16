/**
 * Component DNA Memory — Store and reuse UI component patterns
 *
 * Persists successful layout patterns for future generations.
 * Server: in-memory. Client: localStorage.
 */

import type { UIAnalysis } from "@/lib/agents/vision-analyzer";
import type { CSSTokens } from "./url-pipeline";

interface ComponentPattern {
  industry: string;
  navLayout: string;
  heroLayout: string;
  colorPalette: string[];
  typography: string;
  sections: string[];
  usedAt: number;
}

const MEMORY_KEY = "mocha-component-memory";
const MAX_PATTERNS = 50;

const serverMemory: ComponentPattern[] = [];

function loadPatterns(): ComponentPattern[] {
  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem(MEMORY_KEY);
      if (raw) return JSON.parse(raw);
    } catch {}
  }
  return [...serverMemory];
}

function savePatterns(patterns: ComponentPattern[]): void {
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(MEMORY_KEY, JSON.stringify(patterns.slice(-MAX_PATTERNS)));
    } catch {}
  } else {
    serverMemory.length = 0;
    serverMemory.push(...patterns.slice(-MAX_PATTERNS));
  }
}

export function getComponentMemory(): {
  patterns: ComponentPattern[];
  suggestForIndustry: (industry: string) => ComponentPattern | null;
} {
  const patterns = loadPatterns();
  return {
    patterns,
    suggestForIndustry(industry: string) {
      const match = patterns
        .filter((p) => p.industry === industry)
        .sort((a, b) => b.usedAt - a.usedAt)[0];
      return match ?? null;
    },
  };
}

export function saveToComponentMemory(
  analysis?: UIAnalysis,
  cssTokens?: CSSTokens,
): void {
  if (!analysis) return;

  const pattern: ComponentPattern = {
    industry: analysis.industry ?? "other",
    navLayout: analysis.navbar?.layout ?? "default",
    heroLayout: analysis.hero?.type ?? "overlay",
    colorPalette: analysis.colorScheme
      ? [
          analysis.colorScheme.background,
          analysis.colorScheme.text,
          analysis.colorScheme.accent,
        ]
      : cssTokens?.colors
        ? Object.values(cssTokens.colors).filter(Boolean) as string[]
        : [],
    typography: analysis.typography?.headingFont ?? "sans-serif",
    sections: analysis.sections?.map((s) => s.type) ?? [],
    usedAt: Date.now(),
  };

  const patterns = loadPatterns();
  patterns.push(pattern);
  savePatterns(patterns);
}
