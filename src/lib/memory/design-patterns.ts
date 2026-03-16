/**
 * Design Patterns Memory — Learn and remember UI trends
 *
 * Stores fonts, layouts, and interactive patterns (click→redirect, dropdowns, etc.)
 * so the AI can apply learned patterns to future generations.
 *
 * Persists to: data/design-patterns/patterns.json (server) + localStorage (client)
 */

import type { UIAnalysis } from "@/lib/agents/vision-analyzer";
import type { DOMStructure, CSSTokens } from "@/lib/pipeline/url-pipeline";

export interface InteractivePattern {
  type: string;
  description: string;
  example?: string;
}

export interface DesignPattern {
  id: string;
  sourceUrl?: string;
  industry: string;
  usedAt: number;

  /** Layout patterns */
  navLayout: string;
  heroLayout: string;
  sectionTypes: string[];
  hasNavDropdowns: boolean;

  /** Font & typography */
  fonts: {
    heading: string;
    body: string;
    logo?: string;
    headingWeight?: string;
    logoLetterSpacing?: string;
    navWeight?: string;
  };

  /** Colors */
  colorPalette: string[];
  designMood?: string;

  /** Interactive behaviors — "on click redirects", "dropdown on hover", etc. */
  interactivePatterns: InteractivePattern[];
}

const MEMORY_KEY = "mocha-design-patterns";
const FILE_PATH = "data/design-patterns/patterns.json";
const MAX_PATTERNS = 100;

function generateId(): string {
  return `pat_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function extractInteractivePatterns(dom: DOMStructure): InteractivePattern[] {
  const patterns: InteractivePattern[] = [];

  if (dom.nav.links.length > 0) {
    const hasDropdowns = dom.nav.links.some((l) => l.children && l.children.length > 0);
    patterns.push({
      type: "nav-links-redirect",
      description: "Navigation links redirect to different pages on click",
      example: "Each nav item links to #pagename",
    });
    if (hasDropdowns) {
      patterns.push({
        type: "nav-dropdown-on-hover",
        description: "Nav items with sub-pages show dropdown on hover",
        example: "Main nav → sub-pages in dropdown",
      });
    }
  }

  if (dom.nav.hasCart) {
    patterns.push({
      type: "cart-icon-clickable",
      description: "Cart icon in header, click redirects to cart/checkout",
    });
  }
  if (dom.nav.hasSearch) {
    patterns.push({
      type: "search-icon-clickable",
      description: "Search icon opens search or redirects to search page",
    });
  }
  if (dom.hero.ctaHref) {
    patterns.push({
      type: "hero-cta-redirect",
      description: "Hero CTA button redirects to shop/landing on click",
      example: dom.hero.ctaText ?? "View More / Shop Now",
    });
  }

  const hasProductGrid = dom.sections.some(
    (s) => s.type === "grid" || s.content.toLowerCase().includes("product"),
  );
  if (hasProductGrid) {
    patterns.push({
      type: "product-cards-clickable",
      description: "Product/category cards redirect to product/category page on click",
    });
  }

  return patterns;
}

function loadFromFile(): DesignPattern[] {
  if (typeof window !== "undefined") return [];
  try {
    const path = require("path");
    const fs = require("fs");
    const fullPath = path.join(process.cwd(), FILE_PATH);
    if (fs.existsSync(fullPath)) {
      const raw = fs.readFileSync(fullPath, "utf-8");
      return JSON.parse(raw);
    }
  } catch {}
  return [];
}

function saveToFile(patterns: DesignPattern[]): void {
  if (typeof window !== "undefined") return;
  try {
    const path = require("path");
    const fs = require("fs");
    const fullPath = path.join(process.cwd(), FILE_PATH);
    const dir = path.dirname(fullPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(fullPath, JSON.stringify(patterns, null, 2), "utf-8");
  } catch (e) {
    console.warn("[design-patterns] Could not save to file:", e);
  }
}

function loadFromStorage(): DesignPattern[] {
  if (typeof window === "undefined") return loadFromFile();
  try {
    const raw = localStorage.getItem(MEMORY_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

function saveToStorage(patterns: DesignPattern[]): void {
  const trimmed = patterns.slice(-MAX_PATTERNS);
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(MEMORY_KEY, JSON.stringify(trimmed));
    } catch {}
  } else {
    saveToFile(trimmed);
  }
}

export function getDesignPatterns(): DesignPattern[] {
  if (typeof window !== "undefined") {
    return loadFromStorage().sort((a, b) => b.usedAt - a.usedAt);
  }
  return loadFromFile().sort((a, b) => b.usedAt - a.usedAt);
}

export function getRecentPatterns(limit = 10): DesignPattern[] {
  return getDesignPatterns().slice(0, limit);
}

export function getPatternsForIndustry(industry: string): DesignPattern[] {
  return getDesignPatterns()
    .filter((p) => p.industry === industry || p.industry === "other")
    .slice(0, 5);
}

/** Format learned patterns for injection into planner prompt */
export function formatPatternsForPrompt(patterns: DesignPattern[]): string {
  if (patterns.length === 0) return "";

  const lines: string[] = [
    "",
    "LEARNED DESIGN PATTERNS (apply these when relevant):",
    ...patterns.slice(0, 5).flatMap((p) => {
      const parts: string[] = [];
      if (p.interactivePatterns.length > 0) {
        parts.push(
          `- Interactive: ${p.interactivePatterns.map((i) => i.description).join("; ")}`,
        );
      }
      if (p.fonts) {
        parts.push(
          `- Fonts: heading=${p.fonts.heading}, logo=${p.fonts.logo ?? "same"}, weight=${p.fonts.headingWeight ?? "bold"}`,
        );
      }
      parts.push(`- Layout: nav=${p.navLayout}, hero=${p.heroLayout}`);
      if (p.hasNavDropdowns) {
        parts.push("- Nav has dropdown sub-menus (main items with children)");
      }
      return parts;
    }),
  ];
  return lines.join("\n");
}

/** Save from vision analysis only (e.g. when generating from reference image, no URL) */
export function saveDesignPatternFromAnalysis(
  analysis: UIAnalysis,
  sourceUrl?: string,
): void {
  const patterns = getDesignPatterns();
  const pattern: DesignPattern = {
    id: generateId(),
    sourceUrl,
    industry: analysis.industry ?? "other",
    usedAt: Date.now(),
    navLayout: analysis.navbar?.layout ?? "default",
    heroLayout: analysis.hero?.type ?? "overlay",
    sectionTypes: analysis.sections?.map((s) => s.type) ?? [],
    hasNavDropdowns: false,
    fonts: {
      heading: analysis.typography?.headingFont ?? "sans-serif",
      body: analysis.typography?.bodyFont ?? "sans-serif",
      logo: analysis.typography?.logoFont,
      headingWeight: analysis.typography?.headingWeight,
      logoLetterSpacing: analysis.typography?.logoLetterSpacing,
      navWeight: analysis.typography?.navWeight,
    },
    colorPalette: analysis.colorScheme
      ? [
          analysis.colorScheme.background,
          analysis.colorScheme.text,
          analysis.colorScheme.accent,
        ].filter(Boolean)
      : [],
    designMood: analysis.designMood,
    interactivePatterns: [
      { type: "nav-links-redirect", description: "Navigation links redirect to different pages on click" },
      { type: "hero-cta-redirect", description: "Hero CTA button redirects on click", example: analysis.hero?.ctaButtonText },
    ].filter((p) => p.example !== undefined || p.type === "nav-links-redirect"),
  };
  patterns.push(pattern);
  saveToStorage(patterns);
}

export function saveDesignPattern(
  analysis: UIAnalysis | null,
  dom: DOMStructure,
  cssTokens: CSSTokens,
  sourceUrl?: string,
): void {
  const patterns = getDesignPatterns();
  const interactivePatterns = extractInteractivePatterns(dom);

  const pattern: DesignPattern = {
    id: generateId(),
    sourceUrl,
    industry: analysis?.industry ?? "other",
    usedAt: Date.now(),
    navLayout: analysis?.navbar?.layout ?? "default",
    heroLayout: analysis?.hero?.type ?? "overlay",
    sectionTypes: analysis?.sections?.map((s) => s.type) ?? dom.sections.map((s) => s.type),
    hasNavDropdowns: dom.nav.links.some((l) => l.children && l.children.length > 0),
    fonts: {
      heading: analysis?.typography?.headingFont ?? "sans-serif",
      body: analysis?.typography?.bodyFont ?? "sans-serif",
      logo: analysis?.typography?.logoFont,
      headingWeight: analysis?.typography?.headingWeight,
      logoLetterSpacing: analysis?.typography?.logoLetterSpacing,
      navWeight: analysis?.typography?.navWeight,
    },
    colorPalette: analysis?.colorScheme
      ? [
          analysis.colorScheme.background,
          analysis.colorScheme.text,
          analysis.colorScheme.accent,
        ].filter(Boolean)
      : cssTokens?.colors
        ? (Object.values(cssTokens.colors).filter(Boolean) as string[])
        : [],
    designMood: analysis?.designMood,
    interactivePatterns:
      interactivePatterns.length > 0
        ? interactivePatterns
        : [
            {
              type: "nav-links-redirect",
              description: "Navigation links redirect to different pages on click",
            },
          ],
  };

  patterns.push(pattern);
  saveToStorage(patterns);
}
