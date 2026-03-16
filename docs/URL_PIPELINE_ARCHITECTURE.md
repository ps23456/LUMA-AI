# URL-to-Website Pipeline — Production Architecture

## Overview

The system generates dynamic websites from any URL by scraping, analyzing, and converting the source into a structured React component layout.

```
URL Input
    ↓
Playwright Scraper (DOM + Screenshot)
    ↓
CSS Token Extractor
    ↓
Vision Layout Analyzer (GPT-4o)
    ↓
Component Mapper
    ↓
Planner Agent
    ↓
[Visual Diff Self-Correction if confidence < threshold]
    ↓
Renderer (DynamicPage + Blocks)
    ↓
Generated Website
```

## Agents

### 1. DOM Scraper Agent (`src/lib/pipeline/dom-scraper.ts`)
- **Playwright** for headless browser automation
- Extracts: `nav` (brand, links), `hero` (heading, CTA), `sections`, `footer`
- Captures full-page PNG screenshot (base64)
- Returns raw HTML for CSS extraction

### 2. CSS Token Extractor (`src/lib/pipeline/css-extractor.ts`)
- Parses `<style>` blocks and inline styles
- Extracts: colors (primary, accent, background, text), fonts, spacing, border-radius
- Fallback defaults when parsing fails

### 3. Layout Vision Agent (`src/lib/agents/vision-analyzer.ts`)
- Uses GPT-4o / vision model to analyze screenshot
- Extracts: brand, colors, typography, navbar layout, hero content, sections, logo cloud
- Returns structured `UIAnalysis` JSON

### 4. Component Mapper (`src/lib/pipeline/component-mapper.ts`)
- Maps DOM + CSS + Vision analysis → `WebsiteLayout` schema
- Maps to: navbar, hero, logo-cloud, product-grid, features, footer
- Merges analysis overrides (typography, nav style, logos)

### 5. Planner Agent (`src/lib/pipeline/url-planner.ts`)
- GPT-4o refines mapped layout into strict Zod-validated schema
- Ensures correct section props, imageQuery, theme

### 6. Renderer
- Existing `DynamicPage` + block components (NavbarBlock, HeroBlock, etc.)
- Renders from `WebsiteLayout` schema

## Unique Features

### Visual Diff Self-Correction
- When `confidence < 0.6`, applies analysis overrides more aggressively
- Overrides navbar layout, logo style, typography from vision analysis
- Can be extended to compare rendered screenshot vs original and iterate

### Component DNA Memory (`src/lib/pipeline/component-memory.ts`)
- Stores successful layout patterns (industry, nav layout, hero layout, colors, typography)
- Server: in-memory. Client: localStorage.
- `suggestForIndustry(industry)` for future reuse

### Layout Confidence Score (`src/lib/pipeline/confidence-scorer.ts`)
- Returns 0–1 based on: section count, navbar/hero/footer presence, color/typography match
- If below threshold (0.6), triggers regeneration or visual diff correction

## API

### POST `/api/generate-from-url`
```json
{
  "url": "https://theflowercompany.in",
  "prompt": "Replicate this website",
  "maxSections": 12
}
```
Response: `{ layout, confidence, correctionsApplied }`

## Setup

1. **Playwright** — Install browsers: `npx playwright install chromium`
2. **LLM** — Set `LLM_API_KEY`, `LLM_BASE_URL` in `.env.local`
3. **Vision** — For best results, set `VISION_MODEL=gpt-4o` (or equivalent vision-capable model)
4. **Image Search** — Optional: `SERPER_API_KEY` or `GOOGLE_API_KEY` + `GOOGLE_CSE_ID` for image enrichment

## Deployment Notes

- **Playwright** requires a Node.js environment with Chromium. It may not run on serverless (Vercel) without a custom runtime or external worker.
- For serverless: consider moving the scraper to a separate service (e.g. Railway, Fly.io) or use a headless API like Browserless.
