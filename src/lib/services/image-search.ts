interface SerperImage {
  title: string;
  imageUrl: string;
  thumbnailUrl?: string;
  imageWidth: number;
  imageHeight: number;
}

interface SerperResponse {
  images?: SerperImage[];
}

interface GoogleSearchItem {
  link: string;
  image?: { width: number; thumbnailLink?: string };
}

interface GoogleSearchResponse {
  items?: GoogleSearchItem[];
}

const imageCache = new Map<string, string[]>();
const verifiedCache = new Map<string, boolean>();

async function isImageAccessible(url: string): Promise<boolean> {
  if (verifiedCache.has(url)) return verifiedCache.get(url)!;

  try {
    const controller = new AbortController();
    const tid = setTimeout(() => controller.abort(), 2000);

    const res = await fetch(url, {
      method: "HEAD",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        Accept: "image/*,*/*;q=0.8",
      },
      signal: controller.signal,
      redirect: "follow",
    });

    clearTimeout(tid);

    const ok =
      res.ok &&
      (res.headers.get("content-type")?.startsWith("image/") ?? false);
    verifiedCache.set(url, ok);
    return ok;
  } catch {
    verifiedCache.set(url, false);
    return false;
  }
}

export async function searchImages(
  query: string,
  count: number = 4,
): Promise<string[]> {
  const cacheKey = `${query}-${count}`;
  if (imageCache.has(cacheKey)) {
    return imageCache.get(cacheKey)!;
  }

  let urls: string[] = [];

  if (process.env.SERPER_API_KEY) {
    urls = await searchWithSerper(query, count);
  } else if (process.env.GOOGLE_API_KEY && process.env.GOOGLE_CSE_ID) {
    urls = await searchWithGoogle(query, count);
  }

  if (urls.length > 0) {
    imageCache.set(cacheKey, urls);
  }

  return urls;
}

async function searchWithSerper(
  query: string,
  count: number,
): Promise<string[]> {
  try {
    const res = await fetch("https://google.serper.dev/images", {
      method: "POST",
      headers: {
        "X-API-KEY": process.env.SERPER_API_KEY!,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ q: query, num: Math.min(count * 5, 40) }),
    });

    if (!res.ok) return [];

    const data = (await res.json()) as SerperResponse;
    const candidates = (data.images ?? []).filter(
      (img) => img.imageWidth >= 300,
    );

    const reliable = candidates.filter((img) => isReliableHost(img.imageUrl));
    const others = candidates.filter((img) => !isReliableHost(img.imageUrl));
    const ordered = [...reliable, ...others];

    const verified: string[] = [];
    for (const img of ordered) {
      if (verified.length >= count) break;

      if (isReliableHost(img.imageUrl)) {
        verified.push(img.imageUrl);
        continue;
      }

      const accessible = await isImageAccessible(img.imageUrl);
      if (accessible) {
        verified.push(img.imageUrl);
      } else if (img.thumbnailUrl) {
        verified.push(img.thumbnailUrl);
      }
    }

    return verified;
  } catch {
    return [];
  }
}

function isReliableHost(url: string): boolean {
  try {
    const host = new URL(url).hostname;
    const reliableHosts = [
      "images.unsplash.com",
      "m.media-amazon.com",
      "images-na.ssl-images-amazon.com",
      "i.imgur.com",
      "upload.wikimedia.org",
      "cdn.shopify.com",
      "i.ebayimg.com",
      "target.scene7.com",
      "pisces.bbystatic.com",
      "store.storeimages.cdn-apple.com",
      "lp2.hm.com",
      "static.nike.com",
      "assets.adidas.com",
      "encrypted-tbn0.gstatic.com",
      "fdn2.gsmarena.com",
      "fdn.gsmarena.com",
      "image-us.samsung.com",
      "www.notebookcheck.net",
      "rukminim2.flixcart.com",
      "rukminim1.flixcart.com",
      "media.croma.com",
      "www.reliancedigital.in",
    ];
    return reliableHosts.some(
      (rh) => host === rh || host.endsWith("." + rh),
    );
  } catch {
    return false;
  }
}

async function searchWithGoogle(
  query: string,
  count: number,
): Promise<string[]> {
  try {
    const params = new URLSearchParams({
      key: process.env.GOOGLE_API_KEY!,
      cx: process.env.GOOGLE_CSE_ID!,
      q: query,
      searchType: "image",
      num: String(Math.min(count * 2, 10)),
      imgSize: "large",
      safe: "active",
    });

    const res = await fetch(
      `https://www.googleapis.com/customsearch/v1?${params.toString()}`,
    );

    if (!res.ok) return [];

    const data = (await res.json()) as GoogleSearchResponse;
    const candidates = (data.items ?? [])
      .filter((item) => item.link)
      .map((item) => item.link);

    const verified: string[] = [];
    for (const url of candidates) {
      if (verified.length >= count) break;
      const accessible = await isImageAccessible(url);
      if (accessible) verified.push(url);
    }

    return verified;
  } catch {
    return [];
  }
}

const FALLBACK_IMAGES: Record<string, string> = {
  hero: "https://images.unsplash.com/photo-1557804506-669a67965ba0?w=1200",
  product: "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=600",
  logo: "https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=300",
  default: "https://images.unsplash.com/photo-1557804506-669a67965ba0?w=1200",
};

function getFallbackImage(query: string): string {
  const q = query.toLowerCase();
  if (q.includes("logo")) return FALLBACK_IMAGES.logo;
  if (q.includes("product") || q.includes("ecommerce") || q.includes("shop")) return FALLBACK_IMAGES.product;
  if (q.includes("flower") || q.includes("bouquet") || q.includes("floral")) {
    return "https://images.unsplash.com/photo-1490750967868-88aa4486c946?w=1200";
  }
  return FALLBACK_IMAGES.hero;
}

export async function searchSingleImage(query: string): Promise<string> {
  let results = await searchImages(query, 1);
  if (results[0]) return results[0];
  const broader = query.includes("logo") ? "company logo" : query.includes("product") ? "ecommerce product" : "hero banner";
  if (broader !== query) {
    results = await searchImages(broader, 1);
    if (results[0]) return results[0];
  }
  return getFallbackImage(query);
}
