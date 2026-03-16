import OpenAI from "openai";
import {
  WebsiteLayoutSchema,
  type WebsiteLayout,
} from "@/lib/schema/website-layout";
import type { UIAnalysis } from "@/lib/agents/vision-analyzer";
import { toSpecificFont, LEGACY_TO_SPECIFIC } from "@/lib/utils/fonts";
import { getRecentPatterns, formatPatternsForPrompt } from "@/lib/memory/design-patterns";

const SECTION_TYPES_DOC = `
AVAILABLE SECTION TYPES (20 total):

1. NAVBAR
{ "type": "navbar", "props": { "brand": "string", "links": [{ "label": "string", "href": "#" }], "ctaText": "optional string", "ctaHref": "#", "navStyle": "default|centered", "logoStyle": "text|icon" } }
brand: Use the ACTUAL company/store name (e.g. "Samsung Store", "The Flower Company"), NOT the product category (never "SMARTPHONE", "FLOWERS", "PHONES" as brand).
navStyle: "default" = logo left + links right (standard). "centered" = brand name centered at top with wide letter-spacing, links in a row below (elegant/luxury style). logoStyle: "text" = brand name only, no icon (elegant); "icon" = icon + text.

2. BANNER (announcement strip at top)
{ "type": "banner", "props": { "text": "string", "ctaText": "optional", "ctaHref": "#", "dismissible": true } }

3. HERO (multiple layout variants)
{ "type": "hero", "props": { "badge": "optional", "heading": "2-6 words", "subheading": "string", "ctaText": "string", "ctaHref": "#", "ctaVariant": "accent|outlined - use outlined for white/light buttons with dark text", "secondaryCtaText": "optional", "secondaryCtaHref": "#", "heroLayout": "carousel|overlay|split|centered", "stats": [{ "value": "10M+", "label": "Customers" }], "imageQuery": "string", "slides": [{ "badge": "optional", "heading": "2-4 words", "subheading": "string", "ctaText": "string", "ctaHref": "#", "imageQuery": "specific image query" }], "autoPlayInterval": 5000 } }

heroLayout variants:
- "carousel": Multiple slides with arrows/dots, auto-rotating. Use with "slides" array of 3-5 items. Best for e-commerce homepages.
- "overlay": Full-width background image with centered text overlay. Elegant, immersive. Best for luxury brands, fashion, photography, restaurants.
- "split": Two-column layout with text on left and image on right. Modern, bold. Best for tech, SaaS, startups.
- "centered": Centered text with gradient background, no image. Clean, minimal. Best for services, agencies, blogs.
- "multi-panel": 3+ columns side-by-side, each with image+heading+CTA. Use with "slides" or panels. Great for category showcases, e-commerce "Shop by" grids.

Choose heroLayout based on the brand aesthetic. Vary your choice — don't always use the same layout. ALWAYS include imageQuery for hero — required for background image.

4. SPLIT-CONTENT (About Us pattern — image one side, text other)
{ "type": "split-content", "props": { "heading": "string", "subheading": "optional", "body": "paragraph text", "imageQuery": "search for image", "imagePosition": "left|right", "ctaText": "optional", "ctaHref": "#" } }
Use for About Us, company story, brand tale — image on left or right, heading + body text on other side. imagePosition "left" = image left (like theflowercompany About Us).

5. FEATURES (with glassmorphism cards)
{ "type": "features", "props": { "heading": "string", "subheading": "string", "features": [{ "title": "string", "description": "string", "icon": "zap|shield|rocket|star|heart|globe|lock|chart|clock|check|shoe|fire|sparkle|target|bolt|paint|truck|gift|medal|crown" }] } }

6. PRICING
{ "type": "pricing", "props": { "heading": "string", "subheading": "string", "tiers": [{ "name": "string", "price": "$XX/mo", "description": "string", "features": ["string"], "ctaText": "string", "highlighted": boolean }] } }

7. TESTIMONIALS
{ "type": "testimonials", "props": { "heading": "string", "subheading": "string", "testimonials": [{ "name": "string", "role": "string", "quote": "string", "avatar": "single letter" }] } }

8. CTA
{ "type": "cta", "props": { "heading": "string", "subheading": "string", "ctaText": "string", "ctaHref": "#" } }

8. PRODUCT-GRID
{ "type": "product-grid", "props": { "heading": "string", "subheading": "string", "products": [{ "name": "string", "category": "string", "price": "string", "originalPrice": "optional", "badge": "NEW|SALE|BESTSELLER", "imageQuery": "exact product name for Google Images", "colors": ["red","blue"] }] } }

10. NEWSLETTER
{ "type": "newsletter", "props": { "heading": "string", "subheading": "string", "placeholder": "Enter your email", "buttonText": "Subscribe" } }

11. STATS (animated counting numbers)
{ "type": "stats", "props": { "stats": [{ "value": "10,000+", "label": "string" }] } }

12. FAQ (accordion)
{ "type": "faq", "props": { "heading": "string", "subheading": "string", "items": [{ "question": "string", "answer": "string" }] } }

13. LOGO-CLOUD (infinite marquee of partner/brand logos)
{ "type": "logo-cloud", "props": { "heading": "As featured in", "subheading": "optional", "logos": [{ "name": "Company Name", "icon": "emoji (optional)", "imageQuery": "Company logo png (for image logos)" }] } }

14. GALLERY (bento-style image grid)
{ "type": "gallery", "props": { "heading": "string", "subheading": "string", "images": [{ "alt": "string", "imageQuery": "specific image search query" }] } }

15. TEAM
{ "type": "team", "props": { "heading": "string", "subheading": "string", "members": [{ "name": "string", "role": "string", "bio": "optional short bio", "socials": [{ "platform": "LinkedIn|Twitter|GitHub", "url": "#" }] }] } }

16. CONTACT (form with info sidebar)
{ "type": "contact", "props": { "heading": "string", "subheading": "string", "email": "optional", "phone": "optional", "address": "optional", "formFields": ["name","email","message"] } }

17. TIMELINE (how it works / process steps)
{ "type": "timeline", "props": { "heading": "string", "subheading": "string", "steps": [{ "title": "string", "description": "string" }] } }

18. VIDEO (YouTube/Vimeo embed)
{ "type": "video", "props": { "heading": "optional", "subheading": "optional", "videoUrl": "https://youtube.com/watch?v=..." } }

19. FOOTER (multi-column with socials)
{ "type": "footer", "props": { "brand": "string", "links": [{ "label": "string", "href": "#" }], "columns": [{ "title": "Product", "links": [{ "label": "Features", "href": "#" }] }], "copyright": "string", "socials": [{ "platform": "Twitter|LinkedIn|Instagram|GitHub", "url": "#" }] } }

20. CUSTOM (freeform section — for ANY unique layout that doesn't fit standard blocks)
{ "type": "custom", "props": { "heading": "optional", "subheading": "optional", "html": "<div style='...'>...</div>", "images": [{ "id": "img1", "imageQuery": "search query for this image" }] } }

CUSTOM SECTION RULES:
- Use ONLY inline styles (style="...") in the HTML. Do NOT use CSS classes.
- Available CSS variables in styles: var(--accent) for accent color, var(--font-theme) for heading font family.
- For images, add entries to the "images" array with a unique "id" and an "imageQuery". Reference them in HTML as: <img src="{{img:img1}}" alt="..." style="width:100%; height:300px; object-fit:cover; border-radius:0.75rem;" />
- Use custom sections for: collection grids, category showcases, shop-by grids, unique hero patterns, city selectors, interactive layouts, side-by-side comparisons, or ANY design pattern not covered by the 18 standard blocks.
- The custom section renders inside a max-w-7xl container with padding. Only the inner HTML is your responsibility.
- Keep HTML clean and semantic. Use display:grid and display:flex for layouts.
`;

const SYSTEM_PROMPT = `You are an expert website designer and layout planner. You generate rich, professional, visually stunning website layouts as structured JSON.

CORE PRINCIPLE: First understand the user's intent and context, then make changes. Parse what they actually want before outputting. Your edits must match their request.

You are HIGHLY ADAPTIVE — you invent NEW templates and layouts based on each request. Do NOT default to the same layout every time. Instead:
- Infer the brand type, industry, and mood from the user's request
- Create a UNIQUE layout that fits — vary section order, hero style, and section mix
- Use different styles: minimal, bold, editorial, playful, corporate, luxury, tech-forward, etc.
- Combine sections in fresh ways — e.g. a SaaS site might use timeline + features + pricing; an e-commerce site might use banner + hero overlay + custom "Shop by Category" grid
- Use CUSTOM sections freely when standard blocks don't capture the design — category cards, comparison tables, unique grids, etc.
- Follow latest UI trends: bento grids, asymmetric layouts, bold typography, distinctive color palettes

You MUST return ONLY valid JSON. No markdown, no explanation, no code fences.

Schema:
{
  "title": "string - website title",
  "description": "string - brief site description",
  "theme": {
    "mode": "light" | "dark",
    "primaryColor": "hex color for brand",
    "accentColor": "hex color for accent/CTA",
    "fontFamily": "Inter|Poppins|Montserrat|DM Sans|Space Grotesk|Outfit|Plus Jakarta Sans|Playfair Display|Lora|Libre Baskerville|Roboto|Courier New" (REQUIRED — pick ONE that matches the brand)
  },
  "sections": [array of section objects]
}
${SECTION_TYPES_DOC}
DESIGN RULES:
- ALWAYS include navbar and footer for HOME pages
- Use 6-12 sections per page for a complete, professional look
- Pick heroLayout based on the brand: "overlay" for luxury/fashion/food, "carousel" for e-commerce, "split" for tech/SaaS, "centered" for minimal/services
- Use navStyle "centered" for elegant/luxury brands, "default" for everything else
- fontFamily MUST be one of: Inter, Poppins, Montserrat, DM Sans, Space Grotesk, Outfit, Plus Jakarta Sans, Playfair Display, Lora, Libre Baskerville, Roboto, Courier New. NEVER use generic "sans-serif" or "serif". Pick a SPECIFIC font that matches the brand.
- LAYOUT VARIETY — adapt sections to the request. These are SUGGESTIONS, not rigid templates. Create your own combinations:
  - E-commerce: often banner + hero (carousel or overlay) + product-grid or custom category grid + features + testimonials + newsletter + footer — but vary order and add/remove sections
  - SaaS/Tech: often hero (split or centered) + features + pricing + stats + testimonials + cta + footer — or use timeline, team, faq in different orders
  - Luxury/Fashion: often hero (overlay) + gallery or custom + testimonials + newsletter + footer
  - Agency/Portfolio: often hero (overlay/centered) + gallery + features + team + testimonials + contact + footer
  - Invent NEW combinations for hybrid or niche brands (e.g. "project management SaaS" → split hero + features + timeline + pricing + stats + cta)
- Use CUSTOM sections for unique layouts: "Shop by Collection" grids, category cards, comparison tables, bento grids, city selectors, etc.
- All content must be realistic, branded, and professional
- AVOID template repetition: each layout should feel distinct. Vary section order, hero style (overlay vs split vs centered vs carousel vs multi-panel), color palette (pick accent colors that match the brand — not always orange), and font choices
- NAVBAR BRAND = actual company/store name (e.g. "Samsung", "The Flower Company"), NOT the product category. Never use generic category words like "SMARTPHONE", "FLOWERS", "PHONES" as the site name — use the real brand.
- ALWAYS include imageQuery for hero slides and EVERY product
- imageQuery should be EXACT real product/image descriptions for Google Images
- Hero headings: SHORT and PUNCHY (2-6 words). Hero content should be DISTINCT from the navbar brand — e.g. feature a product name, campaign, or tagline, not repeat the site name.
- For stats values, use numbers with prefix/suffix (e.g. "$5M+", "10,000+", "99.9%")

MULTI-PAGE WEBSITES:
- HOME pages include navbar and footer. Sub-pages do NOT — they are shared from home.
- Navbar links: href="#pagename" (lowercase, no spaces). Brand links to "#home".
- When modifying, preserve everything the user didn't ask to change.
- Return ONLY the JSON object`;

const REPLICATION_SYSTEM_PROMPT = `You are an expert website designer tasked with REPLICATING a reference website design as faithfully as possible. You will receive a detailed analysis of the reference design and must produce a layout that matches it closely.

You are ADAPTIVE — if the reference design has unique sections that don't fit standard blocks, use the "custom" section type with inline-styled HTML to recreate them exactly.

You MUST return ONLY valid JSON. No markdown, no explanation, no code fences.

REPLICATION RULES — follow these strictly:
1. MATCH THE COLOR SCHEME: Use the exact colors from the analysis for theme.primaryColor, theme.accentColor, and theme.mode
2. MATCH THE TYPOGRAPHY: Set theme.fontFamily from reference. Add logoWeight, logoLetterSpacing, headingWeight, headingLetterSpacing, navWeight, navLetterSpacing when the reference has distinct typography (e.g. wide letter-spacing on logo, bold headings)
3. MATCH THE NAVBAR LAYOUT: If the reference has a centered brand name, use navStyle "centered". If logo-left + links-right, use "default"
4. NAVBAR LINKS: Each link MUST have a UNIQUE href. No duplicate hrefs. If "Shop By Collections" and "Shop By Occasions" both exist, use href="#shopbycollections" and href="#shopbyoccasions" — never the same href twice
5. MATCH THE HERO LAYOUT: If the reference has a full-width background image with centered overlay text, use heroLayout "overlay". If it has a carousel with dots/arrows, use "carousel". If text on one side and image on other, use "split". If centered text with no image, use "centered".
6. HERO CONTENT: Use the EXACT heading and CTA text from the analysis. NEVER use placeholder text like "A large static image showcasing...", "Image here", "Placeholder", or generic descriptions as subheading — use real branded content or leave short
7. MATCH THE SECTION ORDER: Replicate the same types of sections in the same order as the reference
8. MATCH THE CONTENT STRUCTURE: Same number of nav links, same hero style, same grid layouts
9. MATCH THE DESIGN MOOD: Elegant stays elegant, bold stays bold, minimal stays minimal
10. USE THE SAME BRAND NAME from the reference (or the user's prompt if they specify one)
11. Images can differ but should be in the same domain/category. Hero MUST have imageQuery — a specific search phrase for the hero image (e.g. "elegant flower arrangements in glass vases")
12. For unique sections that don't map to standard blocks, use "custom" type with inline-styled HTML
13. Keep the same visual hierarchy and spacing patterns

FORBIDDEN — never include:
- "X Close", "Close" buttons, or modal dismiss elements in the main layout
- Placeholder text like "A large static image...", "Image will go here", "Lorem ipsum"
- Duplicate navbar links (same href appearing twice)

Schema:
{
  "title": "string - website title",
  "description": "string - brief site description",
  "theme": {
    "mode": "light" | "dark",
    "primaryColor": "hex color for brand (match reference)",
    "accentColor": "hex color for accent/CTA (match reference)",
    "fontFamily": "Inter|Poppins|Montserrat|DM Sans|Space Grotesk|Outfit|Plus Jakarta Sans|Playfair Display|Lora|Libre Baskerville|Roboto|Courier New" (match reference — if reference says serif use Playfair Display/Lora, sans-serif use Space Grotesk/Poppins, mono use Courier New),
    "logoWeight": "light|normal|medium|semibold|bold|black (optional - match logo text weight)",
    "logoLetterSpacing": "tight|normal|wide|wider|widest (optional - wide/wider for elegant logos)",
    "headingWeight": "light|normal|medium|semibold|bold|black (optional)",
    "headingLetterSpacing": "tight|normal|wide|wider|widest (optional)",
    "navWeight": "light|normal|medium|semibold|bold (optional)",
    "navLetterSpacing": "tight|normal|wide|wider|widest (optional)"
  },
  "sections": [array of section objects]
}
${SECTION_TYPES_DOC}
MULTI-PAGE:
- Navbar links use href="#pagename" (lowercase). Brand links to "#home".
- HOME pages include navbar + footer. Sub-pages do NOT.

Return ONLY the JSON object.`;

function getLLMConfig(): { apiKey: string; baseURL: string; model: string; fastModel?: string } {
  const apiKey = process.env.LLM_API_KEY;
  if (!apiKey || apiKey.includes("your-") || apiKey.length < 10) {
    throw new Error(
      "LLM_API_KEY is not configured. Set it in your .env.local file. Get a free key at https://console.groq.com/keys",
    );
  }

  return {
    apiKey,
    baseURL: process.env.LLM_BASE_URL ?? "https://api.groq.com/openai/v1",
    model: process.env.LLM_MODEL ?? "llama-3.3-70b-versatile",
    fastModel: process.env.LLM_FAST_MODEL ?? "llama-3.1-8b-instant",
  };
}

interface PromptContext {
  brand: string | null;
  pages: string[];
  currency: string | null;
  currencySymbol: string;
  theme: string | null;
}

function extractPromptContext(prompt: string): PromptContext {
  const lower = prompt.toLowerCase();

  let brand: string | null = null;
  const brandPatterns = [
    /(?:create|build|make|design)\s+(?:a\s+)?(\w+)\s+(?:website|site|store|shop)/i,
    /(\w+)\s+(?:website|site|store|shop|brand)/i,
  ];
  for (const pattern of brandPatterns) {
    const match = prompt.match(pattern);
    if (match?.[1]) {
      const candidate = match[1].toLowerCase();
      const skipWords = ["a", "an", "the", "my", "our", "this", "new", "modern", "beautiful", "simple", "frontend", "full"];
      if (!skipWords.includes(candidate)) {
        brand = match[1].charAt(0).toUpperCase() + match[1].slice(1);
        break;
      }
    }
  }

  const pages: string[] = [];
  const pagePatterns = [
    /(\d+)\s+pages?\s+(?:in\s+(?:the\s+)?)?(?:header|navbar|nav|menu)\s+(.+?)(?:\.\s|$|each\s)/i,
    /(?:header|navbar|nav|menu)\s+(?:will\s+)?(?:show|have|include|contain)s?\s+(?:\d+\s+)?(?:pages?\s+)?(.+?)(?:\.\s|$|each\s)/i,
    /(?:pages?|sections?|tabs?)[\s:]+(?:in\s+(?:the\s+)?(?:header|navbar|nav|menu)\s+)?(?:like\s+|such as\s+|[-–]\s*)?(.+?)(?:\.\s|$|and\s+(?:in|each|the|all))/i,
  ];
  for (const pattern of pagePatterns) {
    const match = prompt.match(pattern);
    if (match) {
      const raw = (match[2] || match[1]).trim();
      const chunks = raw.split(/\s*,\s*|\s+and\s+/i).map((s) => s.trim()).filter(Boolean);
      const expanded: string[] = [];
      for (const chunk of chunks) {
        const words = chunk.split(/\s+/);
        if (words.length >= 3) {
          for (const w of words) expanded.push(w);
        } else {
          expanded.push(chunk);
        }
      }
      for (const item of expanded) {
        const cleaned = item.replace(/^(?:and|or)\s+/i, "").trim();
        if (cleaned.length > 1 && cleaned.length < 30) {
          pages.push(cleaned.replace(/\b\w/g, (c) => c.toUpperCase()));
        }
      }
      if (pages.length > 0) break;
    }
  }

  let currency: string | null = null;
  let currencySymbol = "$";
  const currencyMap: Record<string, [string, string]> = {
    "indian": ["Indian Rupees (INR)", "₹"],
    "inr": ["Indian Rupees (INR)", "₹"],
    "rupee": ["Indian Rupees (INR)", "₹"],
    "₹": ["Indian Rupees (INR)", "₹"],
    "euro": ["Euros (EUR)", "€"],
    "eur": ["Euros (EUR)", "€"],
    "€": ["Euros (EUR)", "€"],
    "pound": ["British Pounds (GBP)", "£"],
    "gbp": ["British Pounds (GBP)", "£"],
    "£": ["British Pounds (GBP)", "£"],
    "yen": ["Japanese Yen (JPY)", "¥"],
    "jpy": ["Japanese Yen (JPY)", "¥"],
    "usd": ["US Dollars (USD)", "$"],
    "dollar": ["US Dollars (USD)", "$"],
  };
  for (const [key, [name, symbol]] of Object.entries(currencyMap)) {
    if (lower.includes(key)) {
      currency = name;
      currencySymbol = symbol;
      break;
    }
  }

  let theme: string | null = null;
  if (lower.includes("dark")) theme = "dark";
  else if (lower.includes("light")) theme = "light";

  return { brand, pages, currency, currencySymbol, theme };
}

function buildReplicationUserContent(
  prompt: string,
  analysis: UIAnalysis,
  projectPages?: string[],
): string {
  const rawLinks = analysis.navbar.links;
  const seen = new Set<string>();
  const uniqueLinks = rawLinks.filter((l) => {
    const norm = l.toLowerCase().replace(/\s+/g, "");
    if (seen.has(norm)) return false;
    seen.add(norm);
    return true;
  });

  const allPages = projectPages?.length
    ? projectPages
    : uniqueLinks.filter((l) => l.toLowerCase() !== "home");

  const linkList =
    allPages.length > 0 ? allPages : uniqueLinks.filter((l) => l.toLowerCase() !== "home");
  const hrefSeen = new Set<string>();
  const navLinksJson = [
    { label: "Home", href: "#home" },
    ...linkList
      .map((p) => ({
        label: p,
        href: `#${p.toLowerCase().replace(/\s+/g, "")}`,
      }))
      .filter((link) => {
        const h = link.href.toLowerCase();
        if (hrefSeen.has(h)) return false;
        hrefSeen.add(h);
        return true;
      }),
  ];

  const navLinksInstruction = `Navbar links — use EXACTLY these (each href unique): ${JSON.stringify(navLinksJson)}`;

  const heroHeading = analysis.hero.headingText || "";
  const heroCta = analysis.hero.ctaButtonText || "";
  const heroImageDesc = analysis.hero.imageDescription || "";

  const heroExactContent =
    heroHeading || heroCta || heroImageDesc
      ? `
HERO EXACT CONTENT (use these EXACT strings — do not paraphrase):
- heading: "${heroHeading}"
- ctaText: "${heroCta}"
- imageQuery: "${heroImageDesc}" (use this for hero background image search)`
      : "";

  const isLight =
    analysis.colorScheme.background.toLowerCase().includes("#f") ||
    analysis.colorScheme.background.toLowerCase().includes("#e") ||
    analysis.colorScheme.background.toLowerCase().includes("#d") ||
    analysis.colorScheme.background.toLowerCase().includes("#c") ||
    analysis.colorScheme.background === "#ffffff" ||
    analysis.colorScheme.background === "#fff";

  return `REPLICATE THIS DESIGN EXACTLY. Here is the detailed analysis of the reference website:

BRAND: ${analysis.brandName}
INDUSTRY: ${analysis.industry}
DESIGN MOOD: ${analysis.designMood}

COLOR SCHEME:
- Background: ${analysis.colorScheme.background}
- Text: ${analysis.colorScheme.text}
- Accent/CTA: ${analysis.colorScheme.accent}
- Nav background: ${analysis.colorScheme.navBackground}

TYPOGRAPHY:
- Heading font: ${analysis.typography.headingFont} — ${analysis.typography.headingStyle}
- Body font: ${analysis.typography.bodyFont}
- Nav font: ${analysis.typography.navFont} — ${analysis.typography.navStyle}

NAVBAR:
- Layout: ${analysis.navbar.layout}
- Logo image query: ${analysis.navbarLogoImageQuery ?? "none (text-only)"}
- Navigation links (no duplicates): ${uniqueLinks.join(", ")}
${navLinksInstruction}

HERO:
- Type: ${analysis.hero.type}
- Text alignment: ${analysis.hero.textAlignment}
- Has overlay text: ${analysis.hero.hasOverlayText}
- CTA button style: ${analysis.hero.ctaStyle}
- Has dot indicators: ${analysis.hero.hasDotIndicators}
${heroExactContent}

SECTIONS IN ORDER:
${analysis.sections.map((s, i) => `${i + 1}. ${s.type}: ${s.description}`).join("\n")}
${analysis.logoCloud?.logos?.length ? `\nLOGO CLOUD (include this section): ${analysis.logoCloud.heading ?? "As featured in"} — logos: ${analysis.logoCloud.logos.map((l) => `${l.name} (imageQuery: ${l.imageQuery})`).join(", ")}` : ""}

OVERALL: ${analysis.overallDescription}

USER'S INSTRUCTIONS: "${prompt}"

CRITICAL REPLICATION RULES:
1. Set theme.mode to "${isLight ? "light" : "dark"}"
2. Set theme.primaryColor to "${analysis.colorScheme.background}"
3. Set theme.accentColor to "${analysis.colorScheme.accent}"
4. Set theme.fontFamily to "${toSpecificFont(analysis.typography.headingFont)}"
5. Set navbar navStyle to "${analysis.navbar.layout}", logoStyle to "${analysis.navbar.logoStyle ?? (analysis.navbar.layout === "centered" ? "text" : "icon")}", and logoImageQuery when navbar has an image logo
6. Use brand name "${analysis.brandName}" exactly
7. If analysis has logoCloud with logos, include a logo-cloud section with each logo's name and imageQuery
8. Set theme typography from analysis: logoWeight "${analysis.typography.logoWeight ?? "bold"}", logoLetterSpacing "${analysis.typography.logoLetterSpacing ?? "wide"}", headingWeight "${analysis.typography.headingWeight ?? "bold"}", headingLetterSpacing "${analysis.typography.headingLetterSpacing ?? "normal"}", navWeight "${analysis.typography.navWeight ?? "medium"}", navLetterSpacing "${analysis.typography.navLetterSpacing ?? "wide"}"
9. For hero: use heading "${heroHeading || "the main heading from the reference"}", ctaText "${heroCta || "SHOP NOW"}", imageQuery "${heroImageDesc || "elegant product photography"}" — NEVER use placeholder text like "A large static image" or "Image here"
10. Match the section types and order from the reference
11. If hero.type is "fullscreen-image" or "static" with hasOverlayText, use heroLayout "overlay". If "carousel" with hasDotIndicators, use "carousel"
12. NEVER add "X Close", "Close" buttons, or modal elements — only replicate the main page
13. NEVER use placeholder text — always use real, branded content
14. This is the HOME PAGE — include navbar and footer
15. Return ONLY valid JSON`;
}

/** Infer a distinctive font from prompt/title so we avoid defaulting to generic Inter. */
function inferFontFromPrompt(prompt: string, title?: string): string {
  const text = `${(prompt || "").toLowerCase()} ${(title || "").toLowerCase()}`;
  if (/\b(saas|tech|software|management|project|startup|platform)\b/.test(text)) return "Space Grotesk";
  if (/\b(luxury|elegant|fashion|boutique|premium)\b/.test(text)) return "Playfair Display";
  if (/\b(developer|coding|code|tech)\b/.test(text)) return "Space Grotesk";
  if (/\b(ecommerce|shop|store|flower|product)\b/.test(text)) return "Poppins";
  if (/\b(agency|portfolio|creative)\b/.test(text)) return "Outfit";
  if (/\b(restaurant|food|cafe)\b/.test(text)) return "Lora";
  return "Space Grotesk"; // default to distinctive, not Inter
}

export async function planWebsiteLayout(
  prompt: string,
  existingLayout?: WebsiteLayout,
  pageName?: string,
  projectPages?: string[],
  isHomePage?: boolean,
  activePageName?: string,
  image?: string,
  uiAnalysis?: UIAnalysis | null,
): Promise<WebsiteLayout> {
  const config = getLLMConfig();

  let targetModel = config.model;
  if (image && targetModel === "llama-3.3-70b-versatile") {
    targetModel = "llama-3.2-90b-vision-preview";
  } else if (existingLayout && !image && config.fastModel) {
    targetModel = config.fastModel;
  }

  const client = new OpenAI({
    apiKey: config.apiKey,
    baseURL: config.baseURL,
  });

  const isReplication = !!uiAnalysis && !!image;
  let userContent: string;

  const isSubPage = isHomePage === false;
  const pagesContext = projectPages?.length
    ? `This website has the following pages: ${projectPages.join(", ")}.`
    : "";

  const context = extractPromptContext(prompt);

  if (isReplication && !existingLayout) {
    userContent = buildReplicationUserContent(prompt, uiAnalysis, projectPages);
  } else if (existingLayout && isSubPage) {
    const subCurrency = context.currency ? `ALL prices must be in ${context.currency} (symbol: ${context.currencySymbol}).` : "";
    const existingSections = existingLayout.sections
      .filter((s) => s.type !== "navbar" && s.type !== "footer")
      .map((s) => s.type)
      .join(", ");

    userContent = `${pagesContext}

Here is the CURRENT layout of the "${pageName}" sub-page:
${JSON.stringify(existingLayout, null, 2)}

The user wants to ADD or CHANGE content on this page: "${prompt}"

WORKFLOW: First understand what the user wants (intent + context), then apply only those changes. Preserve everything else.

CRITICAL RULES:
1. KEEP all existing sections that the user didn't ask to remove. Current sections: ${existingSections}
2. ADD the new sections the user requested (e.g., testimonials, features, faq, stats, etc.) AFTER the existing sections
3. Use the SAME theme: ${JSON.stringify(existingLayout.theme)}
4. Include "title", "description", and "theme" in your response
5. Do NOT include navbar or footer — they are shared from the home page
6. ${subCurrency}
7. Return the FULL updated JSON with ALL sections (old + new)`;
  } else if (existingLayout) {
    const navInstruction = isHomePage && projectPages?.length
      ? `\nCRITICAL: The website currently has these pages: ${projectPages.join(", ")}. If the user asks to update the navbar/header, ensure these pages are linked.`
      : "";
    const activePageContext = activePageName
      ? `\nPAGE SCOPE — You are editing the "${activePageName}" page ONLY. The user is viewing this page. Apply changes ONLY to this page's layout. Do NOT modify other pages. If they say "this page", "here", or "this section", they mean the "${activePageName}" page.`
      : "";

    const screenshotContext = image
      ? `\n\nSCREENSHOT CONTEXT — The user attached a screenshot of their current page. Look at the image to understand:
- Which section/container are they pointing at? (hero, split-content, product-grid, etc.)
- Is there an empty image slot, placeholder, or "add image" area visible? That's where they want the change.
- When they say "add image here in this container", the screenshot shows the exact container. Match it to the corresponding section in the layout JSON (e.g. split-content with empty imageUrl, hero with empty slides, etc.) and update ONLY that section.`
      : "";

    const replicationContext = uiAnalysis
      ? `\n\nThe user provided a REFERENCE IMAGE. Here is the analysis of the reference design:\n${JSON.stringify(uiAnalysis, null, 2)}\n\nApply the reference design's color scheme, typography, navbar style, and section structure to the updated layout. Match the mood: ${uiAnalysis.designMood}. Use fontFamily: "${toSpecificFont(uiAnalysis.typography.headingFont)}". Use navStyle: "${uiAnalysis.navbar.layout}".`
      : "";

    userContent = `Here is the current website layout for the "${pageName}" page:\n${JSON.stringify(existingLayout, null, 2)}\n\nThe user wants to make changes: "${prompt}"\n${activePageContext}${screenshotContext}${navInstruction}${replicationContext}

WORKFLOW — First understand, then act:
1. UNDERSTAND: Parse the user's intent and context. What exactly do they want? If they attached a screenshot, look at it — it shows which section/container they mean. (e.g. "add image here in this container" + screenshot of split-content = add image to that split-content section; "add flowers in hero" = hero carousel images)
2. ACT: Apply only the changes that match their intent. Preserve everything else. Your edits must reflect what the user asked for. Target ONLY the section they're pointing at.

CRITICAL — PRESERVE IMAGES when the user only asks for text changes:
- If the user asks ONLY for subheading, heading, content, or body text — do NOT change imageQuery or imageUrl. Keep them exactly as they are. Do NOT remove or modify image fields.
- Only change imageQuery/imageUrl when the user explicitly asks to change, add, replace, or update an image.

CRITICAL — When the user asks for content/body text:
- You MUST update the "body" field with the requested content. Never leave generic placeholder text like "Add your content here..." when the user asked for specific content. Write 2-4 sentences that match their request.

CRITICAL — When the user asks to add, change, replace, or update images (in hero, split-content, or any section):
- Hero: set "imageQuery" on the hero section and on EACH slide in "slides". Without it, the hero stays empty.
- Split-content (About Us, company story): set "imageQuery" on that section. It uses imageUrl + imageQuery for the side image.
- When changing an image: set the new "imageQuery" to match what the user asked (e.g. "beautiful flower bouquet" → "beautiful flower bouquet professional photography"). Do NOT keep the old imageUrl — omit it so the system fetches a fresh image.
- Match the imageQuery to what the user asked: "flowers sharp images" → "sharp flowers bouquet professional"; "add flowers here" → "luxury flower arrangements"; "change image to X" → use X in imageQuery.
- imageQuery is used by Serper/Google to fetch real images. Do NOT remove it. If a section has no imageQuery, ADD one based on the user's words and the section context.

Return the FULL updated layout JSON with the requested changes applied. Keep everything the user didn't ask to change.${formatPatternsForPrompt(getRecentPatterns(5))}`;
  } else if (isSubPage) {
    const subCurrency = context.currency ? `ALL prices must be in ${context.currency} (symbol: ${context.currencySymbol}).` : "";
    userContent = `${pagesContext} Generate a layout for the "${pageName}" sub-page of the website. ${prompt}

IMPORTANT: This is a SUB-PAGE. The navbar and footer are SHARED from the home page automatically. Do NOT include navbar or footer sections in your response — they will be injected at render time.

Your sections array should contain ONLY content sections (product-grid, features, stats, faq, testimonials, gallery, etc).

Focus specifically on ${pageName} content — use product-grid with 6-8 real ${pageName} products, each with real names, imageQuery for Google Images, and realistic prices. ${subCurrency} Do NOT include a hero carousel.${formatPatternsForPrompt(getRecentPatterns(5))}`;
  } else {
    const navPages = context.pages.length > 0
      ? context.pages
      : projectPages?.filter((p) => p !== "Home") ?? [];

    const navLinksInstruction = navPages.length > 0
      ? `The navbar MUST include these links: [{"label":"Home","href":"#home"}, ${navPages.map((p) => `{"label":"${p}","href":"#${p.toLowerCase().replace(/\s+/g, "")}"}`).join(", ")}]. Each link will navigate to a sub-page.`
      : "";

    const currencyInstruction = context.currency
      ? `ALL prices must be in ${context.currency} (e.g., "${context.currencySymbol}49,999", "${context.currencySymbol}1,29,999").`
      : "";

    const themeInstruction = context.theme
      ? `Use a ${context.theme} theme.`
      : "";

    const brandInstruction = context.brand
      ? `This is a "${context.brand}" branded website. Use the brand name in navbar, hero, footer, and all content.`
      : "";

    userContent = `Generate a COMPLETE website layout for this request:

"${prompt}"

WORKFLOW: First infer the user's intent (brand type, industry, what they need). Then design a layout that matches.

${brandInstruction}
${navLinksInstruction}
${currencyInstruction}
${themeInstruction}

REQUIREMENTS:
- This is the HOME PAGE — include navbar and footer
- INFER the best layout from the request: adapt sections, hero style, and section order to the brand/industry
- For e-commerce: hero (carousel or overlay) + product-grid or custom category grid + features + testimonials + newsletter
- For SaaS/tech/management: hero (split or centered) + features + pricing + stats + testimonials + cta — vary with timeline, team, faq as needed
- For other types: invent a layout that fits — use 6-12 sections, mix hero (overlay/split/centered/carousel), features, gallery, team, contact, etc.
- Pick a distinctive theme (colors, font) that matches the brand — avoid generic defaults
- Include navbar with page links (href="#pagename") and footer with multiple columns

CRITICAL — CREATE A NEW STYLE EACH TIME (do NOT repeat the same template):
- Navbar brand = actual company/store name (e.g. "Samsung Store", "Galaxy Shop"), NEVER the product category ("SMARTPHONE", "PHONES", "FLOWERS")
- Hero heading = feature product or tagline — NOT a repeat of the navbar brand
- Vary heroLayout: try split, overlay, carousel, centered, or multi-panel — pick one that fits but is DIFFERENT from the usual default
- Vary navStyle: "centered" for elegant/luxury, "default" for tech/e-commerce — match the brand mood
- Each from-scratch site should feel UNIQUE — different section order, different hero style, different accent color

- Return ONLY valid JSON${formatPatternsForPrompt(getRecentPatterns(10))}`;
  }

  const systemPrompt = isReplication ? REPLICATION_SYSTEM_PROMPT : SYSTEM_PROMPT;

  const userMessageContent = image
    ? [
      { type: "text", text: userContent },
      { type: "image_url", image_url: { url: image } }
    ]
    : userContent;

  const response = await client.chat.completions.create({
    model: targetModel,
    temperature: isReplication ? 0.35 : 0.7,
    max_tokens: 4096,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userMessageContent as string | Array<OpenAI.Chat.ChatCompletionContentPart> },
    ],
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error("No response received from the AI model.");
  }

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(content) as Record<string, unknown>;
  } catch {
    throw new Error("AI returned invalid JSON. Please try again.");
  }

  if (!parsed.title && existingLayout?.title) {
    parsed.title = existingLayout.title;
  }
  if (!parsed.title && pageName) {
    parsed.title = pageName;
  }
  if (!parsed.title && uiAnalysis?.brandName) {
    parsed.title = uiAnalysis.brandName;
  }
  if (!parsed.title) {
    parsed.title = "Website";
  }
  if (!parsed.description) {
    parsed.description = parsed.title;
  }
  if (!parsed.theme && existingLayout?.theme) {
    parsed.theme = existingLayout.theme;
  }
  if (!parsed.theme) {
    parsed.theme = { mode: "dark", primaryColor: "#0a0a0a", accentColor: "#f97316", fontFamily: "Space Grotesk" };
  }

  // Ensure fontFamily is a specific font, not generic sans-serif/serif/mono
  const theme = parsed.theme as Record<string, unknown>;
  const validFonts = ["Inter", "Poppins", "Montserrat", "DM Sans", "Space Grotesk", "Outfit", "Plus Jakarta Sans", "Playfair Display", "Lora", "Libre Baskerville", "Roboto", "Courier New"];
  const ff = theme?.fontFamily as string | undefined;
  if (!ff || (ff && LEGACY_TO_SPECIFIC[ff]) || !validFonts.includes(ff)) {
    const resolved = (ff && LEGACY_TO_SPECIFIC[ff]) ?? inferFontFromPrompt(prompt, parsed.title as string);
    theme.fontFamily = resolved;
  }

  const result = WebsiteLayoutSchema.safeParse(parsed);
  if (!result.success) {
    throw new Error(
      `AI response does not match expected schema: ${JSON.stringify(result.error.issues, null, 2)}`,
    );
  }

  return sanitizeLayout(result.data);
}

function toInternalHref(label: string, href: string): string {
  if (!href?.startsWith("http")) return href?.startsWith("#") ? href : `#${(label || "page").toLowerCase().replace(/[\s\-_]+/g, "")}`;
  try {
    const u = new URL(href);
    const path = u.pathname.replace(/^\/|\/$/g, "");
    if (!path || path === "index") return "#home";
    const slug = path.split("/").pop()?.replace(/[\s\-_]+/g, "") ?? label.toLowerCase().replace(/[\s\-_]+/g, "");
    return `#${slug || "home"}`;
  } catch {
    return `#${(label || "page").toLowerCase().replace(/[\s\-_]+/g, "")}`;
  }
}

export function sanitizeLayout(layout: WebsiteLayout): WebsiteLayout {
  const sections = layout.sections.map((section) => {
    if (section.type === "navbar") {
      const links = (section.props.links ?? []).map((link) => ({
        ...link,
        href: toInternalHref(link.label, link.href),
        children: link.children?.map((c) => ({
          ...c,
          href: toInternalHref(c.label, c.href),
        })),
      }));
      const seen = new Set<string>();
      const uniqueLinks = links.filter((link) => {
        const href = link.href.toLowerCase().replace(/^#/, "");
        if (seen.has(href)) return false;
        seen.add(href);
        return true;
      });
      return { ...section, props: { ...section.props, links: uniqueLinks } };
    }
    if (section.type === "footer") {
      const links = (section.props.links ?? []).map((link) => ({
        ...link,
        href: toInternalHref(link.label, link.href),
      }));
      const seen = new Set<string>();
      const uniqueLinks = links.filter((link) => {
        const k = `${link.label}-${link.href}`.toLowerCase();
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      });
      return { ...section, props: { ...section.props, links: uniqueLinks } };
    }

    if (section.type === "hero") {
      const props = { ...section.props };
      const placeholderPatterns = [
        /a large static image/i,
        /image (will go|goes) here/i,
        /placeholder/i,
        /lorem ipsum/i,
        /image showcasing/i,
        /showcasing .* arrangements?/i,
      ];
      if (props.subheading && placeholderPatterns.some((p) => p.test(props.subheading ?? ""))) {
        props.subheading = "";
      }
      if (props.slides) {
        props.slides = props.slides.map((slide) => {
          if (slide.subheading && placeholderPatterns.some((p) => p.test(slide.subheading ?? ""))) {
            return { ...slide, subheading: "" };
          }
          return slide;
        });
      }
      return { ...section, props };
    }

    return section;
  });

  return { ...layout, sections };
}
