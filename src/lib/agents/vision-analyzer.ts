import OpenAI from "openai";

export interface UIAnalysis {
  brandName: string;
  industry: string;
  colorScheme: {
    background: string;
    text: string;
    accent: string;
    navBackground: string;
    secondaryBackground: string;
  };
  typography: {
    headingFont: "serif" | "sans-serif" | "mono";
    headingStyle: string;
    bodyFont: "serif" | "sans-serif" | "mono";
    navFont: "serif" | "sans-serif" | "mono";
    logoFont?: "serif" | "sans-serif" | "mono";
    navStyle: string;
    logoWeight?: "light" | "normal" | "medium" | "semibold" | "bold" | "black";
    logoLetterSpacing?: "tight" | "normal" | "wide" | "wider" | "widest";
    headingWeight?: "light" | "normal" | "medium" | "semibold" | "bold" | "black";
    headingLetterSpacing?: "tight" | "normal" | "wide" | "wider" | "widest";
    navWeight?: "light" | "normal" | "medium" | "semibold" | "bold";
    navLetterSpacing?: "tight" | "normal" | "wide" | "wider" | "widest";
  };
  navbar: {
    layout: "default" | "centered";
    logoStyle: "text" | "icon"; // text = brand name only, no icon/symbol; icon = has logo icon/symbol
    hasSearch: boolean;
    hasCart: boolean;
    hasAccount: boolean;
    links: string[];
  };
  hero: {
    type: "carousel" | "static" | "fullscreen-image" | "split" | "multi-panel";
    hasOverlayText: boolean;
    textAlignment: "left" | "center" | "right";
    ctaStyle: "filled" | "outlined" | "text-link";
    hasDotIndicators: boolean;
    headingText?: string;
    ctaButtonText?: string;
    imageDescription?: string;
    panels?: Array<{ heading: string; imageDescription: string; ctaText: string }>;
  };
  sections: Array<{ type: string; description: string }>;
  logoCloud?: {
    heading?: string;
    subheading?: string;
    logos: Array<{ name: string; imageQuery: string }>;
  };
  navbarLogoImageQuery?: string; // when navbar has an image logo (not just text)
  designMood: string;
  overallDescription: string;
}

const VISION_PROMPT = `You are an expert UI/UX design analyst. Analyze this website screenshot in extreme detail so we can faithfully replicate it.

Return STRICT JSON (no markdown, no explanation) with this EXACT structure:

{
  "brandName": "exact brand name visible on the page",
  "industry": "e-commerce|saas|agency|restaurant|portfolio|blog|other",
  "colorScheme": {
    "background": "#hex - main background color of the page",
    "text": "#hex - primary text color",
    "accent": "#hex - accent/CTA button color or primary highlight color",
    "navBackground": "#hex - navigation bar background color",
    "secondaryBackground": "#hex - secondary section background colors if different"
  },
  "typography": {
    "headingFont": "serif or sans-serif or mono",
    "headingStyle": "describe: uppercase? bold? letter-spacing?",
    "bodyFont": "serif or sans-serif or mono",
    "navFont": "serif or sans-serif or mono",
    "logoFont": "serif or sans-serif or mono - font of the brand/logo (often differs from nav, e.g. serif logo + sans-serif nav)",
    "navStyle": "describe: uppercase? weight? letter-spacing?",
    "logoWeight": "light or normal or medium or semibold or bold or black - weight of the logo/brand text",
    "logoLetterSpacing": "tight or normal or wide or wider or widest - letter-spacing of logo (wide/wider/widest for elegant spaced-out logos)",
    "headingWeight": "light or normal or medium or semibold or bold or black - weight of hero/main headings",
    "headingLetterSpacing": "tight or normal or wide or wider or widest - letter-spacing of hero headings",
    "navWeight": "light or normal or medium or semibold or bold - weight of nav links",
    "navLetterSpacing": "tight or normal or wide or wider or widest - letter-spacing of nav links"
  },
  "navbar": {
    "layout": "default (logo left, links right) or centered (brand name centered at top, links in row below)",
    "logoStyle": "text (brand name only, no icon/symbol - elegant/luxury style) or icon (logo has icon/symbol next to text)",
    "hasSearch": true/false,
    "hasCart": true/false,
    "hasAccount": true/false,
    "links": ["list", "all", "visible", "navigation", "links"]
  },
  "hero": {
    "type": "carousel (multiple slides with dots/arrows) | static (single image) | fullscreen-image (full viewport image with overlay) | split (image one side, text other) | multi-panel (3+ columns side-by-side, each with image+title+CTA like product cards)",
    "hasOverlayText": true/false,
    "textAlignment": "left|center|right - where is the hero text positioned",
    "ctaStyle": "filled (solid bg button) | outlined (border only) | text-link (just text)",
    "hasDotIndicators": true/false,
    "headingText": "EXACT hero heading text as shown (e.g. FATHER'S DAY COLLECTION, SHOP BY COLLECTION)",
    "ctaButtonText": "EXACT CTA button text (e.g. SHOP NOW, EXPLORE COLLECTION)",
    "imageDescription": "detailed description of hero image for search query (e.g. elegant flower arrangements in glass vases on wooden table)",
    "panels": "when type is multi-panel: array of {heading, imageDescription, ctaText} for each column, e.g. [{heading: 'CLASSIC CUBO', imageDescription: 'pink roses in square box', ctaText: 'SHOP NOW'}, ...]"
  },
  "sections": [
    {"type": "navbar|hero|product-grid|gallery|features|cta|about|split-content|etc", "description": "detailed description including layout (e.g. 3-column grid, 3x3 image gallery, split layout with image one side text other for About Us, carousel with dots), content, and visual style"}
  ],
  "logoCloud": {
    "heading": "optional - e.g. As featured in, Our partners",
    "subheading": "optional",
    "logos": [{"name": "Brand Name", "imageQuery": "exact search for logo image e.g. Visa logo png"}]
  },
  "navbarLogoImageQuery": "when the navbar has an IMAGE logo (not just text), provide search phrase e.g. The Flower Company logo. Omit if logo is text-only.",
  "designMood": "one of: elegant, modern, minimal, bold, playful, luxury, corporate, rustic, feminine, masculine, clean, vintage",
  "overallDescription": "2-3 sentences describing the complete design aesthetic, color palette, typography choices, spacing style, and overall feel"
}

IMPORTANT:
- Extract EXACT hex colors you see (best guess from the image)
- hero.headingText and hero.ctaButtonText: copy the EXACT text visible in the hero — do not paraphrase
- hero.imageDescription: describe what is IN the hero image (flowers, products, people) so we can search for a similar image
- For navbar.links: list each link ONCE. No duplicates. Use the exact label text (e.g. "SHOP BY COLLECTIONS", "CHOOSE YOUR CITY")
- Pay close attention to font types: serif fonts have small strokes at letter edges, sans-serif are clean
- Note if text is UPPERCASE, has wide LETTER-SPACING, or uses specific weight
- Describe the navbar layout precisely - is the brand centered or left-aligned?
- List ALL sections visible on the page in order from top to bottom
- logoCloud: If you see partner logos, "As featured in", or a row of brand logos, list each with name and imageQuery. imageQuery should be specific (e.g. "Visa logo png", "Nike logo white")
- navbarLogoImageQuery: Only if the navbar has an IMAGE logo (icon, symbol, graphic). Omit if logo is text-only.
- Be specific about button styles (rounded, square, filled, outlined, pill-shaped)
- Do NOT include modal/overlay elements (X Close, cookie banners) in the main layout — focus on the primary page structure
- CRITICAL: Detect hero layout precisely — multi-panel = 3+ columns side-by-side with image+title+CTA each (common in e-commerce). split = image on one side, text block on other. carousel = rotating slides with dots/arrows. fullscreen-image/static = full-width background image with overlay text.
- For About Us / company story sections: use type "about" or "split-content" when you see image on one side (left or right) and text/heading on the other — this is the "one side image one side text" pattern.
- For gallery sections: note grid layout (2x2, 3x3, masonry) and image content for context-aware search
- logoFont: If brand uses serif and nav uses sans-serif (or vice versa), specify both. This creates elegant contrast`;

const openai = new OpenAI({
  apiKey: process.env.LLM_API_KEY,
  baseURL: process.env.LLM_BASE_URL,
});

export async function analyzeUIFromImage(
  imageUrl: string,
): Promise<UIAnalysis | null> {
  try {
    let model = process.env.VISION_MODEL || process.env.LLM_MODEL || "gpt-4o-mini";
    if (model === "llama-3.3-70b-versatile") {
      model = "llama-3.2-90b-vision-preview";
    }

    const response = await openai.chat.completions.create({
      model,
      temperature: 0.2,
      max_tokens: 2000,
      messages: [
        {
          role: "system",
          content: VISION_PROMPT,
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Analyze this website screenshot in detail for replication. Return only the JSON.",
            },
            { type: "image_url", image_url: { url: imageUrl } },
          ],
        },
      ],
    });

    const txt = response.choices[0].message.content || "{}";
    const cleaned = txt
      .replace(/```json\s*/g, "")
      .replace(/```\s*/g, "")
      .trim();

    return JSON.parse(cleaned) as UIAnalysis;
  } catch {
    return null;
  }
}
