/**
 * Replication Engine — Image-first layout generation
 *
 * When given a reference UI image, this engine LEARNS from it and generates
 * a layout that replicates it exactly. The vision model sees the image and
 * outputs the layout directly — no information lost in translation.
 *
 * Philosophy: The image IS the source of truth. We adapt to ANY UI.
 */

import OpenAI from "openai";
import {
  WebsiteLayoutSchema,
  type WebsiteLayout,
} from "@/lib/schema/website-layout";
import type { UIAnalysis } from "@/lib/agents/vision-analyzer";

const REPLICATION_ENGINE_PROMPT = `You are the world's first AI that can replicate ANY website UI from an image with pixel-level accuracy.

REFERENCE IMAGE MODE: When the user provides an image, it is the SOURCE OF TRUTH. Your job is to replicate the UI and style EXACTLY — not to create something "inspired by" it. Match: layout structure, typography (weights, letter-spacing), colors, logo style (text-only vs icon+text), navbar layout (centered vs default), hero style, spacing, and every visible element.

Your ONLY job when given an image: OUTPUT A JSON LAYOUT THAT RECREATES WHAT YOU SEE EXACTLY.

RULES:
1. LOOK AT THE IMAGE. Every element you see must appear in your output.
2. EXTRACT EXACT TEXT — copy hero headings, nav links, button labels character-for-character
3. EXTRACT EXACT COLORS — use the hex values you see (white #ffffff, black #0a0a0a, etc.)
4. MATCH THE STRUCTURE — header layout, hero style, section order, spacing
5. DO NOT ADD elements not in the image (no "X Close", no placeholders)
6. DO NOT SIMPLIFY — if you see "SHOP BY" with a dropdown, replicate that structure
7. USE imageQuery for hero/product images — specific search phrases (e.g. "luxury flower bouquet in glass vase")
8. Each navbar link gets a UNIQUE href (e.g. #shopbycollections, #shopbyoccasions)

OUTPUT FORMAT — valid JSON only, no markdown:
{
  "title": "exact site title from image",
  "description": "brief description",
  "theme": {
    "mode": "light or dark based on background",
    "primaryColor": "#hex from image",
    "accentColor": "#hex for buttons/accents",
    "fontFamily": "sans-serif or serif or mono based on typography",
    "logoWeight": "light|normal|medium|semibold|bold|black (optional)",
    "logoLetterSpacing": "tight|normal|wide|wider|widest (optional)",
    "headingWeight": "light|normal|medium|semibold|bold|black (optional)",
    "headingLetterSpacing": "tight|normal|wide|wider|widest (optional)",
    "navWeight": "light|normal|medium|semibold|bold (optional)",
    "navLetterSpacing": "tight|normal|wide|wider|widest (optional)"
  },
  "sections": [
    {"type": "navbar", "props": {"brand": "...", "links": [...], "navStyle": "centered or default", "logoStyle": "text or icon", "logoImageQuery": "search phrase when navbar has IMAGE logo (e.g. BrandName logo png)"}},
    {"type": "hero", "props": {"heading": "EXACT text from image", "ctaText": "EXACT button text", "ctaHref": "#", "heroLayout": "overlay or carousel or split or centered", "ctaVariant": "outlined if button is white/light with dark text, else omit", "imageQuery": "search phrase for hero image", "slides": [...]}},
    {"type": "logo-cloud", "props": {"heading": "As featured in", "logos": [{"name": "Brand", "imageQuery": "Brand logo png"}]}},
    ... more sections matching the image
  ]
}

LOGO-CLOUD: When the reference shows partner logos, "As featured in", or a row of brand logos, include a logo-cloud section. Each logo needs name and imageQuery for image search.

NAVBAR: navStyle "centered" = brand centered at top, links in row below (elegant style — use logoStyle "text"). "default" = logo left, links right. logoStyle "text" = brand name only, no icon (use for elegant/luxury references).
HERO: heroLayout "overlay" = full-width image with centered text overlay. "carousel" = multiple slides with dots.
For light themes with white/light hero buttons, the CTA will render with light styling automatically.

Return ONLY the JSON object.`;

function getConfig(): { apiKey: string; baseURL: string; model: string } {
  const apiKey = process.env.LLM_API_KEY;
  if (!apiKey || apiKey.includes("your-") || apiKey.length < 10) {
    throw new Error("LLM_API_KEY is not configured.");
  }
  return {
    apiKey,
    baseURL: process.env.LLM_BASE_URL ?? "https://api.groq.com/openai/v1",
    model: process.env.VISION_MODEL ?? process.env.LLM_MODEL ?? "gpt-4o-mini",
  };
}

export async function generateLayoutFromImage(
  imageUrl: string,
  prompt: string,
  analysis: UIAnalysis | null,
  projectPages?: string[],
): Promise<WebsiteLayout | null> {
  try {
    const config = getConfig();
    let model = config.model;
    if (model === "llama-3.3-70b-versatile") {
      model = "llama-3.2-90b-vision-preview";
    }

    const client = new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.baseURL,
    });

    const analysisContext = analysis
      ? `

PRE-ANALYSIS (use this + look at the image yourself):
- Brand: ${analysis.brandName}
- Navbar logo image: ${analysis.navbarLogoImageQuery ?? "none (text-only)"}
- Logo cloud: ${analysis.logoCloud?.logos?.length ? analysis.logoCloud.logos.map((l) => `${l.name} (${l.imageQuery})`).join(", ") : "none"}
- Hero heading: "${analysis.hero?.headingText ?? ""}"
- Hero CTA: "${analysis.hero?.ctaButtonText ?? ""}"
- Hero image: ${analysis.hero?.imageDescription ?? ""}
- Nav links: ${analysis.navbar?.links?.join(", ") ?? ""}
- Colors: bg ${analysis.colorScheme?.background}, accent ${analysis.colorScheme?.accent}
- Layout: ${analysis.navbar?.layout}, hero ${analysis.hero?.type}
- Typography: logo ${analysis.typography?.logoWeight ?? "bold"} / ${analysis.typography?.logoLetterSpacing ?? "wide"}, heading ${analysis.typography?.headingWeight ?? "bold"} / ${analysis.typography?.headingLetterSpacing ?? "normal"}, nav ${analysis.typography?.navWeight ?? "medium"} / ${analysis.typography?.navLetterSpacing ?? "wide"}
`
      : "";

    const userContent = `REFERENCE IMAGE: Use this screenshot as your source of truth. Replicate its UI and style EXACTLY — layout, typography, colors, logo style, spacing. Do not improvise or simplify.

${prompt}
${analysisContext}

LOOK AT THE IMAGE. Generate JSON that recreates it. Every element. Every color. Every word.`;

    const response = await client.chat.completions.create({
      model,
      temperature: 0.2,
      max_tokens: 4096,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: REPLICATION_ENGINE_PROMPT },
        {
          role: "user",
          content: [
            { type: "text", text: userContent },
            { type: "image_url", image_url: { url: imageUrl } },
          ],
        },
      ],
    });

    const content = response.choices[0]?.message?.content;
    if (!content) return null;

    const parsed = JSON.parse(content) as Record<string, unknown>;
    const result = WebsiteLayoutSchema.safeParse(parsed);
    if (!result.success) return null;

    return result.data;
  } catch {
    return null;
  }
}
