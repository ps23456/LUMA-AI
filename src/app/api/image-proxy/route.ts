import { NextResponse } from "next/server";

const proxyCache = new Map<string, { data: ArrayBuffer; contentType: string }>();
const MAX_CACHE = 200;

const HEADER_STRATEGIES = [
  (origin: string) => ({
    "User-Agent":
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    Referer: origin + "/",
    "Sec-Fetch-Dest": "image",
    "Sec-Fetch-Mode": "no-cors",
    "Sec-Fetch-Site": "same-origin",
  }),
  () => ({
    "User-Agent":
      "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
    Accept: "image/*,*/*;q=0.8",
  }),
  () => ({
    "User-Agent":
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    Accept: "*/*",
  }),
];

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const imageUrl = searchParams.get("url");

  if (!imageUrl) {
    return NextResponse.json({ error: "Missing url param" }, { status: 400 });
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(imageUrl);
  } catch {
    return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
  }

  if (proxyCache.has(imageUrl)) {
    const cached = proxyCache.get(imageUrl)!;
    return new Response(cached.data, {
      headers: {
        "Content-Type": cached.contentType,
        "Cache-Control": "public, max-age=86400, immutable",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }

  const origin = `${parsedUrl.protocol}//${parsedUrl.host}`;

  for (const makeHeaders of HEADER_STRATEGIES) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const res = await fetch(imageUrl, {
        headers: makeHeaders(origin),
        signal: controller.signal,
        redirect: "follow",
      });

      clearTimeout(timeoutId);

      if (!res.ok) continue;

      const contentType = res.headers.get("content-type") ?? "image/jpeg";
      if (
        !contentType.startsWith("image/") &&
        !contentType.includes("octet-stream")
      ) {
        continue;
      }

      const arrayBuf = await res.arrayBuffer();

      if (arrayBuf.byteLength < 500) continue;

      if (proxyCache.size >= MAX_CACHE) {
        const firstKey = proxyCache.keys().next().value;
        if (firstKey) proxyCache.delete(firstKey);
      }
      proxyCache.set(imageUrl, { data: arrayBuf, contentType });

      return new Response(arrayBuf, {
        headers: {
          "Content-Type": contentType,
          "Cache-Control": "public, max-age=86400, immutable",
          "Access-Control-Allow-Origin": "*",
        },
      });
    } catch {
      continue;
    }
  }

  return new NextResponse(null, { status: 404 });
}
