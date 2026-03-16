/**
 * CSS Token Extractor — Extract design tokens from page
 *
 * Extracts: colors, fonts, spacing, container width
 */

import type { CSSTokens } from "./url-pipeline";

function parseColor(val: string): string | undefined {
  if (!val) return undefined;
  const m = val.match(/#[0-9a-fA-F]{3,8}|rgb\([^)]+\)|rgba\([^)]+\)/);
  return m ? m[0] : undefined;
}

function rgbToHex(r: number, g: number, b: number): string {
  return (
    "#" +
    [r, g, b]
      .map((x) => Math.round(x).toString(16).padStart(2, "0"))
      .join("")
  );
}

export function extractCSSTokens(html: string, _dom?: unknown): CSSTokens {
  const tokens: CSSTokens = {
    colors: {},
    fonts: {},
    spacing: {},
  };

  try {
    const styleMatches = html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi);
    const inlineStyles = html.matchAll(/style\s*=\s*["']([^"']*)["']/gi);
    const cssText: string[] = [];

    for (const m of styleMatches) {
      cssText.push(m[1]);
    }
    for (const m of inlineStyles) {
      cssText.push(m[1]);
    }

    const fullCss = cssText.join(" ");

    const colorPatterns = [
      /--primary[^:]*:\s*([^;}\s]+)/gi,
      /--accent[^:]*:\s*([^;}\s]+)/gi,
      /--background[^:]*:\s*([^;}\s]+)/gi,
      /--text[^:]*:\s*([^;}\s]+)/gi,
      /--color-primary[^:]*:\s*([^;}\s]+)/gi,
      /--brand[^:]*:\s*([^;}\s]+)/gi,
      /--main[^:]*:\s*([^;}\s]+)/gi,
      /color:\s*([#\w]+)/gi,
      /background(?:-color)?:\s*([#\w().]+)/gi,
    ];

    const colors: string[] = [];
    for (const pat of colorPatterns) {
      let match;
      while ((match = pat.exec(fullCss)) !== null) {
        const c = parseColor(match[1]) || match[1];
        if (c && c.startsWith("#") && c.length >= 4 && c.length <= 9) {
          colors.push(c);
        }
      }
    }

    if (colors.length > 0) {
      tokens.colors = {
        primary: colors[0],
        accent: colors[1] ?? colors[0],
        background: colors.find((c) => /f|e|d|c|b|a|0/.test(c[1])) ?? "#ffffff",
        text: colors.find((c) => /0|1|2|3|4/.test(c[1])) ?? "#0a0a0a",
      };
    }

    const fontPatterns = [
      /--font[^:]*:\s*([^;}\s,]+)/gi,
      /font-family:\s*([^;}\n]+)/gi,
    ];
    const fonts: string[] = [];
    for (const pat of fontPatterns) {
      let match;
      while ((match = pat.exec(fullCss)) !== null) {
        const f = match[1].replace(/['"]/g, "").trim();
        if (f && f.length > 2 && !fonts.includes(f)) {
          fonts.push(f);
        }
      }
    }
    if (fonts.length > 0) {
      tokens.fonts = {
        heading: fonts[0],
        body: fonts[1] ?? fonts[0],
      };
    }

    const spacingPatterns = [
      /--container[^:]*:\s*([^;}\s]+)/gi,
      /max-width:\s*([^;}\s]+)/gi,
      /padding[^:]*:\s*([^;}\s]+)/gi,
    ];
    const widths: string[] = [];
    for (const pat of spacingPatterns) {
      let match;
      while ((match = pat.exec(fullCss)) !== null) {
        const v = match[1].trim();
        if (v && /^\d|\.\d|rem|px|em|%/.test(v)) {
          widths.push(v);
        }
      }
    }
    if (widths.length > 0) {
      tokens.spacing = {
        containerMaxWidth: widths.find((w) => w.includes("rem") || w.includes("px")) ?? "1280px",
        sectionPadding: widths.find((w) => w.includes("rem") || w.includes("px")) ?? "4rem",
      };
    }

    const radiusMatch = fullCss.match(/border-radius:\s*([^;}\s]+)/gi);
    if (radiusMatch?.[0]) {
      const r = radiusMatch[0].match(/border-radius:\s*([^;}\s]+)/);
      if (r) tokens.borderRadius = r[1];
    }
  } catch {
    tokens.colors = { primary: "#0a0a0a", accent: "#f97316", background: "#ffffff", text: "#0a0a0a" };
  }

  return tokens;
}
