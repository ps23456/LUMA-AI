/**
 * Planner Agent for URL Pipeline — Convert extracted structure to strict JSON schema
 *
 * Uses GPT-4o to refine DOM + CSS + Vision analysis into validated layout.
 */

import OpenAI from "openai";
import {
  WebsiteLayoutSchema,
  type WebsiteLayout,
} from "@/lib/schema/website-layout";
import type { DOMStructure, CSSTokens } from "./url-pipeline";
import type { UIAnalysis } from "@/lib/agents/vision-analyzer";

interface URLPlannerInput {
  url: string;
  prompt: string;
  dom: DOMStructure;
  cssTokens: CSSTokens;
  analysis: UIAnalysis | null;
  mappedLayout: WebsiteLayout;
  maxSections: number;
}

const openai = new OpenAI({
  apiKey: process.env.LLM_API_KEY,
  baseURL: process.env.LLM_BASE_URL,
});

export async function planLayoutFromURLContext(
  input: URLPlannerInput,
): Promise<WebsiteLayout> {
  const { url, prompt, dom, cssTokens, analysis, mappedLayout, maxSections } =
    input;

  const model = process.env.LLM_MODEL ?? "gpt-4o-mini";

  const systemPrompt = `You are an expert website layout planner. Your job is to REPLICATE the source website — the output MUST look similar to it.

CRITICAL: Use the EXACT data from DOM/CSS/mapped layout. Do NOT invent generic content. Preserve:
- Brand name, nav links, hero heading, hero CTA text from the extracted DOM
- Colors (primaryColor, accentColor) from CSS tokens or analysis
- Nav structure, hero layout type, typography from the mapped layout

Return ONLY valid JSON. No markdown, no explanation.

Schema: { "title": string, "description": string, "theme": { "mode": "light"|"dark", "primaryColor": "#hex", "accentColor": "#hex", "fontFamily": "sans-serif"|"serif"|"mono" }, "sections": [...] }

Section types: navbar, hero, logo-cloud, product-grid, features, stats, testimonials, faq, newsletter, footer.
All navbar and footer links MUST use internal hrefs (#shop, #about). Preserve the mapped layout's nav structure exactly.
Hero: heroLayout "overlay"|"carousel"|"split"|"centered", ctaVariant "accent"|"outlined".
Use imageQuery for hero and product images.`;

  const userContent = `URL: ${url}
${prompt ? `User prompt: ${prompt}` : ""}

DOM extracted:
- Brand: ${dom.nav.brand}
- Nav links: ${JSON.stringify(dom.nav.links.slice(0, 8))}
- Hero: ${JSON.stringify(dom.hero)}
- Sections: ${dom.sections.map((s) => s.type + ": " + s.content.slice(0, 80)).join(" | ")}
- Footer: ${JSON.stringify(dom.footer)}

CSS tokens: ${JSON.stringify(cssTokens)}

${analysis ? `Vision analysis: brand=${analysis.brandName}, colors=${JSON.stringify(analysis.colorScheme)}, typography=${JSON.stringify(analysis.typography)}, nav layout=${analysis.navbar?.layout}, hero=${JSON.stringify(analysis.hero)}` : ""}

Mapped layout (use as base, refine): ${JSON.stringify(mappedLayout)}

Return the refined layout JSON. Max ${maxSections} sections. Preserve exact text from DOM/analysis.`;

  try {
    const response = await openai.chat.completions.create({
      model,
      temperature: 0.3,
      max_tokens: 4096,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userContent },
      ],
    });

    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error("No response");

    const parsed = JSON.parse(content) as Record<string, unknown>;
    const result = WebsiteLayoutSchema.safeParse(parsed);

    if (result.success) return result.data;

    return mappedLayout;
  } catch {
    return mappedLayout;
  }
}
