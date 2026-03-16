/**
 * API Route: Generate website from URL
 *
 * POST /api/generate-from-url
 * Body: { url: string, prompt?: string }
 *
 * Pipeline: URL → Playwright Scraper → DOM → CSS → Screenshot → Vision → Mapper → Planner → Layout
 */

import { NextResponse } from "next/server";
import { z } from "zod/v4";
import { runURLPipeline } from "@/lib/pipeline/url-pipeline";

const RequestSchema = z.object({
  url: z.string().url("Invalid URL"),
  prompt: z.string().max(500).optional(),
  maxSections: z.number().min(4).max(20).optional(),
});

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 5;

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }
  if (entry.count >= RATE_LIMIT_MAX_REQUESTS) return false;
  entry.count++;
  return true;
}

export async function POST(request: Request) {
  try {
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";

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

    const { url, prompt, maxSections } = parseResult.data;

    const result = await runURLPipeline({
      url,
      prompt: prompt ?? "",
      maxSections: maxSections ?? 12,
    });

    return NextResponse.json({
      layout: result.layout,
      subPages: result.subPages,
      confidence: result.confidence,
      correctionsApplied: result.correctionsApplied,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "An unexpected error occurred.";
    const status = message.includes("Scraping") ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
