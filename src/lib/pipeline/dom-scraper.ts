/**
 * DOM Scraper Agent — Playwright-based web scraping
 *
 * Extracts: navigation, hero, sections, footer
 * Captures: full-page screenshot
 */

import type { DOMStructure } from "./url-pipeline";

export interface ScrapeResult {
  dom: DOMStructure;
  screenshotBase64: string;
  html: string;
  finalUrl: string;
}

function collectSubPageUrls(dom: DOMStructure, baseOrigin: string, maxUrls: number): Array<{ url: string; name: string }> {
  const seen = new Set<string>();
  const result: Array<{ url: string; name: string }> = [];
  const add = (href: string, label: string) => {
    try {
      const u = new URL(href);
      if (u.origin !== baseOrigin) return;
      const key = u.pathname;
      if (seen.has(key) || key === "/" || key === "/index" || key.length < 2) return;
      seen.add(key);
      const name = (label.trim() || u.pathname.split("/").filter(Boolean).pop()?.replace(/[-_]/g, " ")) || "Page";
      result.push({ url: href, name });
    } catch {}
  };
  for (const l of dom.nav.links) {
    add(l.href, l.label);
    for (const c of l.children ?? []) add(c.href, c.label);
  }
  return result.slice(0, maxUrls);
}

export async function scrapeWithPlaywright(
  url: string,
  options?: { scrapeSubPages?: boolean; maxSubPages?: number },
): Promise<ScrapeResult & { subPages?: Array<{ name: string; url: string; dom: DOMStructure; html: string }> }> {
  try {
    const { chromium } = await import("playwright");
    const browser = await chromium.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const page = await browser.newPage({
      viewport: { width: 1440, height: 900 },
      userAgent:
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    });

    await page.goto(url, { waitUntil: "load", timeout: 45000 });
    const finalUrl = page.url();

    const html = await page.content();

    const dom = await page.evaluate(() => {
      const getText = (el: Element | null) => el?.textContent?.trim() ?? "";
      const getLinks = (container: Element | null) => {
        if (!container) return [];
        const links = container.querySelectorAll("a[href]");
        return Array.from(links)
          .slice(0, 15)
          .map((a) => ({
            label: a.textContent?.trim()?.slice(0, 50) ?? "",
            href: (a as HTMLAnchorElement).href,
          }))
          .filter((l) => l.label && l.href);
      };

      const getImageUrls = (container: Element | null, limit: number): string[] => {
        if (!container) return [];
        const urls: string[] = [];
        const imgs = container.querySelectorAll("img[src]");
        for (const img of Array.from(imgs).slice(0, limit)) {
          const src = (img as HTMLImageElement).src;
          if (src && !src.startsWith("data:") && src.length < 2000) {
            urls.push(src);
          }
        }
        if (urls.length === 0) {
          const bgUrls = extractCssBackgroundUrls(container);
          urls.push(...bgUrls.slice(0, limit));
        }
        return urls;
      };

      const extractCssBackgroundUrls = (el: Element): string[] => {
        const urls: string[] = [];
        const style = window.getComputedStyle(el);
        const bg = style.backgroundImage || (el as HTMLElement).style?.backgroundImage || "";
        const match = bg.match(/url\(["']?([^"')]+)["']?\)/g);
        if (match) {
          for (const m of match) {
            let u = m.replace(/url\(["']?|["']?\)/g, "").trim();
            if (u && !u.startsWith("data:") && u.length < 2000) {
              if (u.startsWith("/")) u = window.location.origin + u;
              else if (!u.startsWith("http")) u = new URL(u, window.location.href).href;
              urls.push(u);
            }
          }
        }
        for (const child of Array.from(el.children).slice(0, 5)) {
          urls.push(...extractCssBackgroundUrls(child));
        }
        return urls;
      };

      const nav = document.querySelector("nav, header, [role='navigation'], .nav, .navbar, .header");
      const getChildLinks = (container: Element): Array<{ label: string; href: string }> => {
        const links = container.querySelectorAll("a[href]");
        return Array.from(links).slice(0, 12).map((a) => ({
          label: a.textContent?.trim()?.slice(0, 50) ?? "",
          href: (a as HTMLAnchorElement).href,
        })).filter((l) => l.label && l.href);
      };
      const getNavWithDropdowns = (): Array<{ label: string; href: string; children?: Array<{ label: string; href: string }> }> => {
        if (!nav) return [];
        const result: Array<{ label: string; href: string; children?: Array<{ label: string; href: string }> }> = [];
        const processed = new Set<string>();
        const allLinks = nav.querySelectorAll("a[href]");
        const parentMap = new Map<Element, Element>();
        for (const a of Array.from(allLinks)) {
          let p: Element | null = a.parentElement;
          while (p && p !== nav && !nav.contains(p)) p = p?.parentElement;
          if (p) parentMap.set(a, p);
        }
        const liItems = nav.querySelectorAll("li, [class*='nav-item'], [class*='menu-item'], [role='menuitem']");
        for (const item of Array.from(liItems)) {
          const mainA = item.querySelector(":scope > a");
          const anchor = mainA || item.querySelector("a[href]");
          if (!anchor || !(anchor as HTMLAnchorElement).href) continue;
          const label = (anchor as HTMLElement).textContent?.trim()?.slice(0, 50) ?? "";
          const href = (anchor as HTMLAnchorElement).href;
          if (!label || processed.has(label + href)) continue;
          const dropdown = item.querySelector(":scope > ul, :scope > div[class*='dropdown'], :scope > div[class*='submenu'], :scope > div[class*='menu'], :scope > [role='menu']");
          const childLinks = dropdown ? getChildLinks(dropdown) : [];
          if (childLinks.length > 0) {
            result.push({ label, href, children: childLinks });
          } else {
            result.push({ label, href });
          }
          processed.add(label + href);
        }
        if (result.length > 0) return result.slice(0, 12);
        const flatLinks = getLinks(nav);
        if (flatLinks.length > 0) {
          const deduped: Array<{ label: string; href: string }> = [];
          const seen = new Set<string>();
          for (const l of flatLinks) {
            const key = l.label.toLowerCase() + l.href;
            if (!seen.has(key)) {
              seen.add(key);
              deduped.push(l);
            }
          }
          return deduped.slice(0, 12).map((l) => ({ label: l.label, href: l.href }));
        }
        const headerLinks = document.querySelectorAll("header a[href], nav a[href]");
        return Array.from(headerLinks).slice(0, 12).map((a) => ({
          label: a.textContent?.trim()?.slice(0, 50) ?? "",
          href: (a as HTMLAnchorElement).href,
        })).filter((l) => l.label && l.href).map((l) => ({ label: l.label, href: l.href }));
      };
      const navLinks = getNavWithDropdowns();
      const hasCart = !!nav?.querySelector("[class*='cart'], [class*='bag'], [aria-label*='cart'], [aria-label*='bag'], .cart, .bag, [href*='cart']");
      const hasSearch = !!nav?.querySelector("[class*='search'], [aria-label*='search'], .search, [type='search']");
      const hasAccount = !!nav?.querySelector("[class*='account'], [class*='user'], [class*='login'], [aria-label*='account'], [aria-label*='user']");
      const currencyEl = nav?.querySelector("[class*='currency'], [class*='inr'], [class*='usd']");
      const currencyText = currencyEl ? currencyEl.textContent?.trim()?.slice(0, 10) : undefined;
      const brandEl = nav?.querySelector(".logo, .brand, [class*='logo'], a[href='/'], a[href='/index']") || document.querySelector("a[href='/']");
      const brand = getText(brandEl as Element) || document.title?.split("|")[0]?.trim() || document.title?.split("-")[0]?.trim() || "Brand";

      const logoImg = brandEl?.querySelector("img[src]") || nav?.querySelector("img[src]");
      const logoImage = logoImg ? (logoImg as HTMLImageElement).src : undefined;

      const hero = document.querySelector("section.hero, .hero, [class*='hero'], [class*='slider'], [class*='carousel'], main > div:first-child") || document.querySelector("main")?.firstElementChild;
      const heroHeading = hero?.querySelector("h1, h2, [class*='heading']");
      const heroSub = hero?.querySelector("p, [class*='subtitle']");
      const heroCta = hero?.querySelector("a[href], button");
      const heroCtaEl = heroCta instanceof HTMLAnchorElement ? heroCta : hero?.querySelector("a[href]");
      let heroImages = getImageUrls(hero ?? null, 8);
      if (heroImages.length === 0) {
        const main = document.querySelector("main");
        heroImages = getImageUrls(main ?? null, 5);
      }
      if (heroImages.length === 0) {
        const firstSection = document.querySelector("section, [class*='section']");
        heroImages = getImageUrls(firstSection ?? null, 5);
      }

      const sections: Array<{ type: string; content: string; selector?: string; images?: string[] }> = [];
      const sectionSelectors = ["section", "article", "[class*='section']", "[class*='grid']", "[class*='features']", "[class*='product']", ".product-card", ".product-item"];
      const seen = new Set<string>();
      for (const sel of sectionSelectors) {
        document.querySelectorAll(sel).forEach((el) => {
          const text = el.textContent?.trim()?.slice(0, 400) ?? "";
          const key = text.slice(0, 50);
          if (key && !seen.has(key) && text.length > 20) {
            seen.add(key);
            const type = el.className?.includes("grid") ? "grid"
              : el.className?.includes("product") ? "grid"
              : el.className?.includes("feature") ? "features" : "section";
            const images = type === "grid" ? getImageUrls(el, 12) : undefined;
            sections.push({ type, content: text, selector: sel, images });
          }
        });
        if (sections.length >= 10) break;
      }

      const productImages: string[] = [];
      for (const s of sections) {
        if (s.images) productImages.push(...s.images);
      }

      const footer = document.querySelector("footer, [role='contentinfo'], .footer");
      const footerLinks = footer ? getLinks(footer) : [];
      const copyrightEl = footer?.querySelector("[class*='copyright'], .footer-bottom");
      const copyright = getText(copyrightEl as Element);

      return {
        nav: {
          brand: brand || "Brand",
          links: navLinks.length ? navLinks : [{ label: "Home", href: "/" }],
          hasCart,
          hasSearch,
          hasAccount,
          currencySelector: currencyText,
        },
        hero: {
          heading: getText(heroHeading as Element),
          subheading: getText(heroSub as Element),
          ctaText: heroCtaEl ? getText(heroCtaEl) : undefined,
          ctaHref: heroCtaEl ? (heroCtaEl as HTMLAnchorElement).href : undefined,
        },
        sections: sections.slice(0, 12),
        footer: {
          brand,
          links: footerLinks.slice(0, 10),
          copyright,
        },
        scrapedImages: {
          hero: heroImages,
          logo: logoImage,
          products: productImages.slice(0, 16),
        },
      };
    });

    const screenshotBuffer = await page.screenshot({
      type: "png",
      fullPage: true,
    });
    const screenshotBase64 = Buffer.from(screenshotBuffer).toString("base64");

    let subPages: Array<{ name: string; url: string; dom: DOMStructure; html: string }> | undefined;
    if (options?.scrapeSubPages) {
      const baseOrigin = new URL(finalUrl).origin;
      const toScrape = collectSubPageUrls(dom as DOMStructure, baseOrigin, options.maxSubPages ?? 8);
      subPages = [];
      for (const { url: subUrl, name } of toScrape) {
        try {
          const { dom: subDom, html: subHtml } = await scrapeSubPage(page, subUrl);
          subPages.push({ name, url: subUrl, dom: subDom, html: subHtml });
        } catch {
          /* skip failed sub-page */
        }
      }
    }

    await browser.close();

    return {
      dom: dom as DOMStructure,
      screenshotBase64,
      html,
      finalUrl,
      subPages,
    };
  } catch (e) {
    if (e instanceof Error) {
      throw new Error(`Scraping failed: ${e.message}`);
    }
    throw e;
  }
}

/** Light scrape for sub-pages (no screenshot). Reuses browser. */
export async function scrapeSubPage(
  page: import("playwright").Page,
  url: string,
): Promise<{ dom: DOMStructure; html: string }> {
  await page.goto(url, { waitUntil: "load", timeout: 30000 });
  const html = await page.content();
  const dom = await page.evaluate(() => {
    const getText = (el: Element | null) => el?.textContent?.trim() ?? "";
    const getLinks = (c: Element | null) => {
      if (!c) return [];
      return Array.from(c.querySelectorAll("a[href]")).slice(0, 15).map((a) => ({
        label: a.textContent?.trim()?.slice(0, 50) ?? "",
        href: (a as HTMLAnchorElement).href,
      })).filter((l) => l.label && l.href);
    };
    const getImageUrls = (c: Element | null, limit: number): string[] => {
      if (!c) return [];
      return Array.from(c.querySelectorAll("img[src]")).slice(0, limit).map((img) => (img as HTMLImageElement).src).filter((s) => s && !s.startsWith("data:") && s.length < 2000);
    };
    const nav = document.querySelector("nav, header, [role='navigation'], .nav, .navbar, .header");
    const hero = document.querySelector("section.hero, .hero, [class*='hero'], main > div:first-child") || document.querySelector("main")?.firstElementChild;
    const sections: Array<{ type: string; content: string; selector?: string; images?: string[] }> = [];
    const sel = ["section", "article", "[class*='section']", "[class*='grid']", "[class*='product']"];
    const seen = new Set<string>();
    for (const s of sel) {
      if (sections.length >= 8) break;
      document.querySelectorAll(s).forEach((el) => {
        const text = el.textContent?.trim()?.slice(0, 400) ?? "";
        if (text.length > 15 && !seen.has(text.slice(0, 50))) {
          seen.add(text.slice(0, 50));
          sections.push({
            type: el.className?.includes("grid") || el.className?.includes("product") ? "grid" : "section",
            content: text,
            images: (el.className?.includes("grid") || el.className?.includes("product")) ? getImageUrls(el, 12) : undefined,
          });
        }
      });
    }
    const footer = document.querySelector("footer, [role='contentinfo'], .footer");
    const productImages = sections.flatMap((s) => s.images ?? []);
    return {
      nav: { brand: getText(nav?.querySelector(".logo, .brand, a[href='/']") ?? null) || "Brand", links: nav ? getLinks(nav).map((l) => ({ label: l.label, href: l.href })) : [] },
      hero: {
        heading: getText(hero?.querySelector("h1, h2") ?? null),
        subheading: getText(hero?.querySelector("p") ?? null),
        ctaText: getText(hero?.querySelector("a, button") ?? null),
        ctaHref: (hero?.querySelector("a[href]") as HTMLAnchorElement | null)?.href,
      },
      sections: sections.slice(0, 10),
      footer: { brand: "", links: footer ? getLinks(footer) : [], copyright: getText(footer?.querySelector("[class*='copyright']") ?? null) },
      scrapedImages: { hero: getImageUrls(hero ?? null, 5), products: productImages.slice(0, 16) },
    };
  });
  return { dom: dom as DOMStructure, html };
}
