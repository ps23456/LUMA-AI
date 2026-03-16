/**
 * URL-to-Website Pipeline — Production Architecture
 *
 * URL Input → Playwright Scraper → DOM Extractor → CSS Token Extractor
 * → Screenshot Capture → Vision Layout Analyzer → Component Mapper
 * → Planner Agent → (Optional: Visual Diff → Self-Correct) → Renderer
 *
 * Unique features:
 * - Visual Diff Self-Correction
 * - Component DNA Memory
 * - Layout Confidence Score
 */

import type { WebsiteLayout } from "@/lib/schema/website-layout";
import type { UIAnalysis } from "@/lib/agents/vision-analyzer";
import { scrapeWithPlaywright } from "@/lib/pipeline/dom-scraper";
import { extractCSSTokens } from "@/lib/pipeline/css-extractor";
import { analyzeUIFromImage } from "@/lib/agents/vision-analyzer";
import { mapToLayoutSchema } from "@/lib/pipeline/component-mapper";
import { planLayoutFromURLContext } from "@/lib/pipeline/url-planner";
import { enforceSourceDesign } from "@/lib/pipeline/design-enforcer";
import { enrichLayoutWithImages } from "@/lib/services/image-enrichment";
import { sanitizeLayout } from "@/lib/agents/planner";
import { getComponentMemory, saveToComponentMemory } from "@/lib/pipeline/component-memory";
import { saveDesignPattern } from "@/lib/memory/design-patterns";
import { computeLayoutConfidence } from "@/lib/pipeline/confidence-scorer";

export interface PipelineInput {
  url: string;
  prompt?: string;
  maxSections?: number;
}

export interface SubPageResult {
  name: string;
  href: string;
  layout: WebsiteLayout;
}

export interface PipelineResult {
  layout: WebsiteLayout;
  subPages?: SubPageResult[];
  confidence: number;
  scrapedData: ScrapedData;
  correctionsApplied: number;
}

export interface ScrapedData {
  dom: DOMStructure;
  cssTokens: CSSTokens;
  screenshotBase64: string;
  analysis: UIAnalysis | null;
}

export interface ScrapedImages {
  hero: string[];
  logo?: string;
  products: string[];
}

export interface NavLinkWithChildren {
  label: string;
  href: string;
  children?: Array<{ label: string; href: string }>;
}

export interface DOMStructure {
  nav: {
    brand?: string;
    links: Array<NavLinkWithChildren>;
    hasCart?: boolean;
    hasSearch?: boolean;
    hasAccount?: boolean;
    currencySelector?: string;
  };
  hero: { heading?: string; subheading?: string; ctaText?: string; ctaHref?: string };
  sections: Array<{ type: string; content: string; selector?: string; images?: string[] }>;
  footer: { brand?: string; links: Array<{ label: string; href: string }>; copyright?: string };
  scrapedImages?: ScrapedImages;
}

export interface CSSTokens {
  colors: { primary?: string; accent?: string; background?: string; text?: string };
  fonts: { heading?: string; body?: string };
  spacing: { containerMaxWidth?: string; sectionPadding?: string };
  borderRadius?: string;
}

const CONFIDENCE_THRESHOLD = 0.6;
const MAX_CORRECTION_ITERATIONS = 2;

export async function runURLPipeline(input: PipelineInput): Promise<PipelineResult> {
  const { url, prompt = "", maxSections = 12 } = input;

  // 1. Playwright Scraper — DOM + Screenshot + Sub-pages
  const scrapeResult = await scrapeWithPlaywright(url, { scrapeSubPages: true, maxSubPages: 8 });
  const { dom, screenshotBase64, html, subPages: scrapedSubPages } = scrapeResult;

  // 2. CSS Token Extractor
  const cssTokens = extractCSSTokens(html, dom);

  // 3. Vision Layout Analyzer (screenshot as data URL for vision API)
  const screenshotDataUrl = `data:image/png;base64,${screenshotBase64}`;
  let analysis: UIAnalysis | null = null;
  try {
    analysis = await analyzeUIFromImage(screenshotDataUrl);
  } catch (e) {
    console.warn("Vision analysis failed, using DOM/CSS only", e);
  }

  // 4. Component Mapper — DOM + Analysis → Layout Schema
  const mappedLayout = mapToLayoutSchema(dom, cssTokens, analysis);

  // 5. Planner Agent — Only refine when no vision analysis (otherwise use mapped layout to preserve source design)
  let layout: WebsiteLayout;
  if (analysis) {
    layout = mappedLayout;
  } else {
    layout = await planLayoutFromURLContext({
      url,
      prompt,
      dom,
      cssTokens,
      analysis,
      mappedLayout,
      maxSections,
    });
  }

  layout = enforceSourceDesign(layout, dom, cssTokens, analysis);
  layout = sanitizeLayout(layout);
  layout = await enrichLayoutWithImages(layout, { scrapedImages: dom.scrapedImages });

  // 5b. Process sub-pages (reuse home nav/footer/theme, sub-page content)
  let subPages: PipelineResult["subPages"];
  if (scrapedSubPages?.length) {
    const homeNavbar = layout.sections.find((s) => s.type === "navbar");
    const homeFooter = layout.sections.find((s) => s.type === "footer");
    subPages = [];
    for (const sp of scrapedSubPages) {
      const subCss = extractCSSTokens(sp.html, sp.dom);
      const subMapped = mapToLayoutSchema(sp.dom, subCss, null);
      const contentSections = subMapped.sections.filter((s) => s.type !== "navbar" && s.type !== "footer" && s.type !== "banner");
      const subLayout: WebsiteLayout = {
        ...layout,
        title: `${layout.title} - ${sp.name}`,
        description: subMapped.description ?? layout.description,
        sections: [
          ...(homeNavbar ? [homeNavbar] : []),
          ...contentSections.slice(0, 8),
          ...(homeFooter ? [homeFooter] : []),
        ],
      };
      const enforced = enforceSourceDesign(subLayout, dom, cssTokens, analysis);
      const slug = new URL(sp.url).pathname.split("/").filter(Boolean).pop()?.replace(/[-_]/g, "") ?? sp.name.toLowerCase().replace(/\s+/g, "");
      subPages.push({
        name: sp.name,
        href: `#${slug}`,
        layout: await enrichLayoutWithImages(sanitizeLayout(enforced), { scrapedImages: sp.dom.scrapedImages }),
      });
    }
  } else {
    subPages = undefined;
  }

  // 6. Component DNA Memory — Store for reuse
  await saveToComponentMemory(analysis ?? undefined, cssTokens);

  // 6b. Design Patterns Memory — Learn fonts, layouts, click→redirect, etc.
  saveDesignPattern(analysis ?? null, dom, cssTokens, url);

  // 7. Layout Confidence Score
  let confidence = computeLayoutConfidence(layout, analysis, dom);

  // 8. Visual Diff Self-Correction (if confidence low and we have screenshot)
  let correctionsApplied = 0;
  if (confidence < CONFIDENCE_THRESHOLD && analysis) {
    const memory = getComponentMemory();
    const corrected = await attemptVisualDiffCorrection(
      layout,
      screenshotDataUrl,
      analysis,
      memory,
    );
    if (corrected) {
      layout = corrected;
      correctionsApplied++;
      confidence = computeLayoutConfidence(layout, analysis, dom);
    }
  }

  // 9. Regenerate if still below threshold (only when no analysis — with analysis we already used mapped layout)
  if (confidence < CONFIDENCE_THRESHOLD && correctionsApplied < MAX_CORRECTION_ITERATIONS && !analysis) {
    layout = await planLayoutFromURLContext({
      url,
      prompt: `${prompt} (regenerate with higher fidelity to reference)`,
      dom,
      cssTokens,
      analysis,
      mappedLayout: layout,
      maxSections,
    });
    layout = enforceSourceDesign(layout, dom, cssTokens, analysis);
    layout = sanitizeLayout(layout);
    layout = await enrichLayoutWithImages(layout, { scrapedImages: dom.scrapedImages });
    confidence = computeLayoutConfidence(layout, analysis, dom);
  }

  return {
    layout,
    subPages,
    confidence,
    scrapedData: { dom, cssTokens, screenshotBase64, analysis },
    correctionsApplied,
  };
}

async function attemptVisualDiffCorrection(
  layout: WebsiteLayout,
  _screenshotDataUrl: string,
  analysis: UIAnalysis,
  _memory: ReturnType<typeof getComponentMemory>,
): Promise<WebsiteLayout | null> {
  // Visual diff would compare rendered output with original screenshot
  // For now, apply analysis overrides more aggressively
  if (!analysis) return null;

  const navIdx = layout.sections.findIndex((s) => s.type === "navbar");
  if (navIdx >= 0 && layout.sections[navIdx].type === "navbar" && analysis.navbar) {
    layout = {
      ...layout,
      sections: layout.sections.map((s, i) =>
        i === navIdx && s.type === "navbar"
          ? {
              ...s,
              props: {
                ...s.props,
                navStyle: analysis.navbar.layout ?? s.props.navStyle,
                logoStyle:
                  analysis.navbar.logoStyle ??
                  (analysis.navbar.layout === "centered" ? "text" : s.props.logoStyle),
              },
            }
          : s,
      ),
    };
  }

  if (analysis.typography && layout.theme) {
    const t = analysis.typography;
    layout = {
      ...layout,
      theme: {
        ...layout.theme,
        logoWeight: t.logoWeight ?? layout.theme.logoWeight,
        logoLetterSpacing: t.logoLetterSpacing ?? layout.theme.logoLetterSpacing,
        headingWeight: t.headingWeight ?? layout.theme.headingWeight,
        headingLetterSpacing: t.headingLetterSpacing ?? layout.theme.headingLetterSpacing,
        navWeight: t.navWeight ?? layout.theme.navWeight,
        navLetterSpacing: t.navLetterSpacing ?? layout.theme.navLetterSpacing,
      },
    };
  }

  return layout;
}
