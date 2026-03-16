/**
 * Layout Confidence Score — Assess fidelity of generated layout to reference
 *
 * Returns 0–1. If below threshold, trigger regeneration or visual diff correction.
 */

import type { WebsiteLayout } from "@/lib/schema/website-layout";
import type { UIAnalysis } from "@/lib/agents/vision-analyzer";
import type { DOMStructure } from "./url-pipeline";

export function computeLayoutConfidence(
  layout: WebsiteLayout,
  analysis: UIAnalysis | null,
  dom: DOMStructure,
): number {
  let score = 0.5;
  const weights: number[] = [];

  if (layout.sections.length >= 3) {
    score += 0.1;
    weights.push(0.1);
  }
  if (layout.sections.some((s) => s.type === "navbar")) {
    score += 0.1;
    weights.push(0.1);
  }
  if (layout.sections.some((s) => s.type === "hero")) {
    score += 0.1;
    weights.push(0.1);
  }
  if (layout.sections.some((s) => s.type === "footer")) {
    score += 0.05;
    weights.push(0.05);
  }

  if (analysis) {
    if (layout.theme.accentColor && analysis.colorScheme?.accent) {
      const match = colorsMatch(layout.theme.accentColor, analysis.colorScheme.accent);
      score += match ? 0.1 : 0.02;
    }
    if (layout.theme.fontFamily === analysis.typography?.headingFont) {
      score += 0.05;
    }
    const navSection = layout.sections.find((s) => s.type === "navbar");
    if (navSection?.type === "navbar" && analysis.navbar) {
      if (navSection.props.navStyle === analysis.navbar.layout) score += 0.05;
      if (navSection.props.brand === analysis.brandName) score += 0.03;
    }
    const heroSection = layout.sections.find((s) => s.type === "hero");
    if (heroSection?.type === "hero" && analysis.hero) {
      if (heroSection.props.heading === analysis.hero.headingText) score += 0.05;
      if (heroSection.props.ctaText === analysis.hero.ctaButtonText) score += 0.03;
    }
  }

  if (dom.nav.brand && layout.sections.some((s) => s.type === "navbar")) {
    const nav = layout.sections.find((s) => s.type === "navbar");
    if (nav?.type === "navbar" && nav.props.brand) score += 0.02;
  }

  return Math.min(1, Math.round(score * 100) / 100);
}

function colorsMatch(a: string, b: string): boolean {
  const norm = (s: string) => s.toLowerCase().replace(/\s/g, "");
  return norm(a) === norm(b) || hexDistance(a, b) < 50;
}

function hexDistance(a: string, b: string): number {
  try {
    const parse = (s: string) => {
      const h = s.replace("#", "");
      const r = parseInt(h.slice(0, 2), 16);
      const g = parseInt(h.slice(2, 4), 16);
      const b = parseInt(h.slice(4, 6), 16);
      return [r, g, b];
    };
    const [r1, g1, b1] = parse(a);
    const [r2, g2, b2] = parse(b);
    return Math.sqrt(
      (r1 - r2) ** 2 + (g1 - g2) ** 2 + (b1 - b2) ** 2,
    );
  } catch {
    return 999;
  }
}
