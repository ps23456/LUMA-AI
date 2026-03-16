import { NextResponse } from "next/server";
import { z } from "zod/v4";
import { planWebsiteLayout, sanitizeLayout } from "@/lib/agents/planner";
import { generateLayoutFromImage } from "@/lib/agents/replication-engine";
import { analyzeUIFromImage } from "@/lib/agents/vision-analyzer";
import { enrichLayoutWithImages } from "@/lib/services/image-enrichment";
import { saveDesignPatternFromAnalysis } from "@/lib/memory/design-patterns";
import { WebsiteLayoutSchema } from "@/lib/schema/website-layout";
import type { WebsiteLayout, Section } from "@/lib/schema/website-layout";

/** Infer imageQuery from user prompt when they ask for images in hero — ensures Serper gets a good search phrase even if planner omits it */
function injectHeroImageQueryFromPrompt(layout: WebsiteLayout, prompt: string): WebsiteLayout {
  const lower = prompt.toLowerCase();
  const imageKeywords = ["image", "images", "photo", "photos", "picture", "pictures", "visual", "visuals", "sharp", "hd", "high quality"];
  const heroKeywords = ["hero", "banner", "header", "top section"];
  const wantsImages =
    imageKeywords.some((k) => lower.includes(k)) ||
    (lower.includes("flower") && (lower.includes("add") || lower.includes("put") || lower.includes("show")));
  const wantsHero = heroKeywords.some((k) => lower.includes(k)) || lower.includes("section");

  if (!wantsImages || (!wantsHero && !lower.includes("section"))) return layout;

  // Extract descriptive terms from prompt (e.g. "flowers sharp images" → "sharp flowers")
  const stopWords = /^(and|or|to|for|with|home|page|please|want|need)$/i;
  const words = prompt
    .replace(/add|put|include|show|display|change|update|in|the|section|hero|banner|image|images|photo|photos/gi, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !stopWords.test(w));
  const descriptive = words.slice(0, 4).join(" ").trim();
  const imageQuery = descriptive
    ? `${descriptive} high quality professional photography`
    : "elegant hero banner professional photography";

  const heroIdx = layout.sections.findIndex((s) => s.type === "hero");
  if (heroIdx < 0) return layout;

  const hero = layout.sections[heroIdx];
  if (hero.type !== "hero") return layout;

  const props = hero.props as { imageQuery?: string; slides?: Array<{ imageQuery?: string }> };
  const hasQuery = !!props.imageQuery?.trim() || props.slides?.some((s) => !!s.imageQuery?.trim());
  if (hasQuery) return layout; // AI already set imageQuery — respect its understanding

  const updatedProps = { ...props, imageQuery };
  if (props.slides?.length) {
    updatedProps.slides = props.slides.map((s) => ({ ...s, imageQuery: s.imageQuery || imageQuery }));
  }

  return {
    ...layout,
    sections: layout.sections.map((s, i) =>
      i === heroIdx ? { ...s, props: updatedProps } : s
    ) as Section[],
  };
}

/** Preserve imageUrl from existing layout for text-only edits — avoids slow re-fetch. */
function preserveExistingImages(
  newLayout: WebsiteLayout,
  existing: WebsiteLayout,
): WebsiteLayout {
  const sections = newLayout.sections.map((newSec, i) => {
    const existingSec = existing.sections[i];
    if (!existingSec || newSec.type !== existingSec.type) return newSec;

    if (newSec.type === "hero" && existingSec.type === "hero") {
      const np = newSec.props;
      const ep = existingSec.props;
      if (!np.backgroundImage && ep.backgroundImage) {
        return { ...newSec, props: { ...np, backgroundImage: ep.backgroundImage } } as Section;
      }
      if (np.slides?.length && ep.slides?.length) {
        const slides = np.slides.map((s, j) => {
          const es = ep.slides?.[j];
          if (!s.backgroundImage && es?.backgroundImage) {
            return { ...s, backgroundImage: es.backgroundImage };
          }
          return s;
        });
        return { ...newSec, props: { ...np, slides } } as Section;
      }
    }

    if (newSec.type === "split-content" && existingSec.type === "split-content") {
      const np = newSec.props;
      const ep = existingSec.props;
      if (!np.imageUrl && ep.imageUrl) {
        return { ...newSec, props: { ...np, imageUrl: ep.imageUrl } } as Section;
      }
    }

    if (newSec.type === "product-grid" && existingSec.type === "product-grid") {
      const np = newSec.props;
      const ep = existingSec.props;
      if (np.products?.length && ep.products?.length) {
        const products = np.products.map((p, j) => {
          const epProd = ep.products?.[j];
          if (!p.image && epProd?.image) return { ...p, image: epProd.image };
          return p;
        });
        return { ...newSec, props: { ...np, products } } as Section;
      }
    }

    return newSec;
  });

  return { ...newLayout, sections };
}

/** When user asks to change image, inject imageQuery and clear imageUrl so enrichment fetches fresh. */
function injectImageQueryForLastSection(layout: WebsiteLayout, prompt: string): WebsiteLayout {
  const lower = prompt.toLowerCase();
  const changeImagePatterns = [
    /change\s+(?:the\s+)?image\s+.*?to\s+(.+?)(?:\.|$)/i,
    /change\s+(?:the\s+)?image\s+to\s+(.+?)(?:\.|$)/i,
    /replace\s+(?:the\s+)?image\s+(?:with|to)\s+(.+?)(?:\.|$)/i,
    /update\s+(?:the\s+)?image\s+(?:to|with)\s+(.+?)(?:\.|$)/i,
    /(?:add|put|use)\s+(?:a\s+)?(.+?)\s+(?:as\s+)?(?:the\s+)?image/i,
    /image\s+(?:should\s+be|as)\s+(.+?)(?:\.|$)/i,
    /(?:here\s+)?(?:in\s+the\s+)?last\s+section\s+change\s+(?:the\s+)?image\s+to\s+(.+?)(?:\.|$)/i,
  ];
  const wantsImageChange =
    /change\s+.*image|replace\s+.*image|update\s+.*image|image\s+(?:fo|to)\s+|make\s+.*image|swap\s+.*image/.test(lower);

  if (!wantsImageChange) return layout;

  let imageQuery = "";
  for (const pat of changeImagePatterns) {
    const m = prompt.match(pat);
    if (m?.[1]) {
      imageQuery = m[1].trim().replace(/\.$/, "");
      break;
    }
  }
  if (!imageQuery && wantsImageChange) {
    const words = prompt
      .replace(/change|replace|update|image|to|the|a|an|in|last|section|here/gi, " ")
      .split(/\s+/)
      .filter((w) => w.length > 2);
    imageQuery = words.slice(0, 5).join(" ") || "professional photography";
  }
  if (!imageQuery) return layout;

  const imageQueryClean = `${imageQuery} professional photography`.trim();

  const splitContentIndices = layout.sections
    .map((s, i) => (s.type === "split-content" ? i : -1))
    .filter((i) => i >= 0);
  const lastSplitIdx = splitContentIndices[splitContentIndices.length - 1];
  if (lastSplitIdx === undefined) return layout;

  const section = layout.sections[lastSplitIdx];
  if (section.type !== "split-content") return layout;

  const props = { ...section.props, imageQuery: imageQueryClean };
  delete (props as { imageUrl?: string }).imageUrl;

  return {
    ...layout,
    sections: layout.sections.map((s, i) =>
      i === lastSplitIdx ? { ...s, props } : s
    ) as Section[],
  };
}

const RequestSchema = z.object({
  prompt: z
    .string()
    .min(10, "Prompt must be at least 10 characters")
    .max(2000, "Prompt must be at most 2000 characters"),
  existingLayout: WebsiteLayoutSchema.optional(),
  pageName: z.string().optional(),
  projectPages: z.array(z.string()).optional(),
  isHomePage: z.boolean().optional(),
  activePageName: z.string().optional(),
  image: z.string().optional(),
});

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 10;

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }

  if (entry.count >= RATE_LIMIT_MAX_REQUESTS) {
    return false;
  }

  entry.count++;
  return true;
}

export async function POST(request: Request) {
  try {
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      "unknown";

    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429 },
      );
    }

    const body: unknown = await request.json();
    const parseResult = RequestSchema.safeParse(body);

    if (!parseResult.success) {
      const detail = parseResult.error.issues[0]?.message ?? "Invalid input";
      return NextResponse.json({ error: detail }, { status: 400 });
    }

    const { prompt, existingLayout, pageName, projectPages, isHomePage, activePageName, image } = parseResult.data;

    let uiAnalysis = null;
    if (image) {
      try {
        uiAnalysis = await analyzeUIFromImage(image);
        if (uiAnalysis) {
          saveDesignPatternFromAnalysis(uiAnalysis);
        }
      } catch (e) {
        console.warn("Vision analysis failed, proceeding without it", e);
      }
    }

    let rawLayout: Awaited<ReturnType<typeof planWebsiteLayout>>;

    if (image && !existingLayout) {
      const replicated = await generateLayoutFromImage(
        image,
        prompt,
        uiAnalysis,
        projectPages,
      );
      rawLayout = (replicated ? sanitizeLayout(replicated) : null) ?? await planWebsiteLayout(
        prompt,
        existingLayout,
        pageName,
        projectPages,
        isHomePage,
        activePageName,
        image,
        uiAnalysis,
      );
    } else {
      rawLayout = await planWebsiteLayout(
        prompt,
        existingLayout,
        pageName,
        projectPages,
        isHomePage,
        activePageName,
        image,
        uiAnalysis,
      );
    }

    // Inject imageQuery from prompt when user asks for hero images — planner sometimes omits it
    rawLayout = injectHeroImageQueryFromPrompt(rawLayout, prompt);
    // When user asks to change image, inject imageQuery and clear imageUrl
    rawLayout = injectImageQueryForLastSection(rawLayout, prompt);

    // Skip image enrichment for text-only modifications — saves 30–60+ seconds
    const promptLower = prompt.toLowerCase();
    const wantsImageChange =
      /image|photo|picture|visual|add\s+.*(?:image|photo)|change\s+.*image|replace\s+.*image/.test(promptLower);
    const needsEnrichment = !existingLayout || wantsImageChange;

    let layout: WebsiteLayout;
    if (needsEnrichment) {
      layout = await enrichLayoutWithImages(rawLayout);
    } else {
      layout = preserveExistingImages(rawLayout, existingLayout);
    }

    // When reference image was provided: FORCE analysis to drive layout — the image IS the source of truth
    if (image && uiAnalysis) {
      const a = uiAnalysis;

      // 1. Override theme typography from vision analysis
      if (layout.theme && a.typography) {
        const t = a.typography;
        layout = {
          ...layout,
          theme: {
            ...layout.theme,
            logoWeight: t.logoWeight ?? layout.theme.logoWeight,
            logoLetterSpacing: t.logoLetterSpacing ?? layout.theme.logoLetterSpacing,
            headingWeight: t.headingWeight ?? layout.theme.headingWeight,
            headingLetterSpacing:
              t.headingLetterSpacing ?? layout.theme.headingLetterSpacing,
            navWeight: t.navWeight ?? layout.theme.navWeight,
            navLetterSpacing: t.navLetterSpacing ?? layout.theme.navLetterSpacing,
          },
        };
      }

      // 2. Override navbar layout, logo style, and logo image from analysis
      const navIdx = layout.sections.findIndex((s) => s.type === "navbar");
      if (navIdx >= 0 && a.navbar) {
        const nav = layout.sections[navIdx];
        if (nav.type === "navbar") {
          layout = {
            ...layout,
            sections: layout.sections.map((s, i) =>
              i === navIdx && s.type === "navbar"
                ? {
                    ...s,
                    props: {
                      ...s.props,
                      navStyle: a.navbar.layout ?? s.props.navStyle,
                      logoStyle:
                        a.navbar.logoStyle ??
                        (a.navbar.layout === "centered" ? "text" : s.props.logoStyle),
                      logoImageQuery: a.navbarLogoImageQuery ?? s.props.logoImageQuery,
                    },
                  }
                : s,
            ),
          };
        }
      }

      // 3. Inject logo-cloud section from analysis when reference has partner/brand logos
      if (a.logoCloud?.logos?.length) {
        const hasLogoCloud = layout.sections.some((s) => s.type === "logo-cloud");
        if (!hasLogoCloud) {
          const insertAfter = layout.sections.findIndex(
            (s) => s.type === "hero" || s.type === "banner",
          );
          const logoCloudSection = {
            type: "logo-cloud" as const,
            props: {
              heading: a.logoCloud.heading,
              subheading: a.logoCloud.subheading,
              logos: a.logoCloud.logos.map((l) => ({
                name: l.name,
                imageQuery: l.imageQuery,
              })),
            },
          };
          const idx = insertAfter >= 0 ? insertAfter + 1 : 1;
          layout = {
            ...layout,
            sections: [
              ...layout.sections.slice(0, idx),
              logoCloudSection,
              ...layout.sections.slice(idx),
            ],
          };
        }
      }
    }

    return NextResponse.json({ layout });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "An unexpected error occurred.";

    const status = message.includes("LLM_API_KEY") ? 503 : 500;

    return NextResponse.json({ error: message }, { status });
  }
}
