import { NextResponse } from "next/server";
import { searchImages, searchSingleImage } from "@/lib/services/image-search";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q");
  const count = Math.min(parseInt(searchParams.get("count") ?? "4", 10) || 4, 8);

  if (!q || q.trim().length < 2) {
    return NextResponse.json({ error: "Query required (min 2 chars)" }, { status: 400 });
  }

  try {
    let urls = await searchImages(q.trim(), count);
    if (urls.length === 0) {
      const fallback = await searchSingleImage(q.trim());
      urls = fallback ? [fallback] : [];
    }
    return NextResponse.json({ urls });
  } catch (e) {
    console.warn("Image search failed:", e);
    try {
      const fallback = await searchSingleImage(q.trim());
      return NextResponse.json({ urls: fallback ? [fallback] : [] });
    } catch {
      return NextResponse.json({ urls: [] });
    }
  }
}
