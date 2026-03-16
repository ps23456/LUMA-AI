/**
 * Component Mapper — Map DOM + Analysis to Layout Schema
 *
 * Maps extracted structure to: navbar, hero, product-grid, features, footer, etc.
 */

import type { WebsiteLayout } from "@/lib/schema/website-layout";
import type { DOMStructure, CSSTokens } from "./url-pipeline";
import type { UIAnalysis } from "@/lib/agents/vision-analyzer";
import { toSpecificFont } from "@/lib/utils/fonts";

function extractProductNamesFromSections(
  sections: Array<{ type: string; content: string }>,
  brand: string,
): Array<{ name: string; category: string; price: string; imageQuery: string }> {
  const products: Array<{ name: string; category: string; price: string; imageQuery: string }> = [];
  const seen = new Set<string>();
  for (const s of sections) {
    const priceMatch = s.content.match(/(?:RS\.|₹|INR|\$|€|£)\s*[\d,]+/gi);
    const price = priceMatch?.[0] ?? "—";
    const lines = s.content.split(/\n/).filter((l) => l.trim().length > 5);
    for (const line of lines) {
      const name = line.replace(/(?:RS\.|₹|INR|\$|€|£)\s*[\d,]+.*$/gi, "").trim().slice(0, 40);
      if (name.length > 2 && !seen.has(name.toLowerCase())) {
        seen.add(name.toLowerCase());
        products.push({
          name,
          category: "Product",
          price,
          imageQuery: `${name} ${brand} product`,
        });
        if (products.length >= 8) return products;
      }
    }
  }
  return products;
}

export function mapToLayoutSchema(
  dom: DOMStructure,
  cssTokens: CSSTokens,
  analysis: UIAnalysis | null,
): WebsiteLayout {
  const colors = (analysis?.colorScheme ?? cssTokens.colors) as Record<string, string | undefined>;
  const primary = cssTokens.colors?.primary ?? colors?.primary ?? colors?.accent ?? "#0a0a0a";
  const accent = colors?.accent ?? cssTokens.colors?.accent ?? "#f97316";
  const bg = colors?.background ?? cssTokens.colors?.background ?? "#ffffff";
  const isLight = /^#([fFeEdDcCbBaA]|[0-9a-fA-F]{2}[fFeEdDcCbBaA])/.test(bg) || bg === "#fff" || bg === "#ffffff";

  const brand = analysis?.brandName ?? dom.nav.brand ?? "Brand";

  const toInternalHref = (label: string, href: string): string => {
    if (!href?.startsWith("http")) return href?.startsWith("#") ? href : `#${(label || href).toLowerCase().replace(/[\s\-_]+/g, "")}`;
    try {
      const u = new URL(href);
      const path = u.pathname.replace(/^\/|\/$/g, "");
      if (!path || path === "index") return "#home";
      const slug = path.split("/").pop()?.replace(/[\s\-_]+/g, "") ?? label.toLowerCase().replace(/[\s\-_]+/g, "");
      return `#${slug || "home"}`;
    } catch {
      return `#${(label || "page").toLowerCase().replace(/[\s\-_]+/g, "")}`;
    }
  };

  // Always use dom.nav.links — they have the full structure (parent + children). Analysis only has flat labels.
  const rawLinks = dom.nav.links;
  const navLinks = rawLinks.map((l, i) => {
    const label = typeof l === "string" ? l : (l as { label: string }).label;
    const href = typeof l === "string" ? undefined : (l as { href?: string }).href;
    const children = typeof l === "object" && "children" in l ? (l as { children?: Array<{ label: string; href: string }> }).children : undefined;
    return {
      label: label || `Link ${i + 1}`,
      href: toInternalHref(label, href ?? "#"),
      ...(children?.length ? { children: children.map((c) => ({ label: c.label, href: toInternalHref(c.label, c.href ?? "#") })) } : {}),
    };
  });

  const heroHeading = analysis?.hero?.headingText ?? dom.hero.heading ?? "Welcome";
  const heroCta = analysis?.hero?.ctaButtonText ?? dom.hero.ctaText ?? "Get Started";
  const industry = analysis?.industry ?? "e-commerce";
  const heroImageDesc =
    analysis?.hero?.imageDescription ??
    `${brand} ${industry} hero banner`;

  const sections: WebsiteLayout["sections"] = [];

  sections.push({
    type: "navbar",
    props: {
      brand,
      links: navLinks.slice(0, 12),
      navStyle: analysis?.navbar?.layout ?? "default",
      logoStyle: analysis?.navbar?.logoStyle ?? (analysis?.navbar?.layout === "centered" ? "text" : "icon"),
      logoImageQuery: analysis?.navbarLogoImageQuery ?? `${brand} logo`,
      hasCart: analysis?.navbar?.hasCart ?? dom.nav.hasCart,
      hasSearch: analysis?.navbar?.hasSearch ?? dom.nav.hasSearch,
      hasAccount: analysis?.navbar?.hasAccount ?? dom.nav.hasAccount,
      currencySelector: dom.nav.currencySelector,
    },
  });

  const heroType = analysis?.hero?.type;
  const heroLayout =
    heroType === "multi-panel"
      ? "multi-panel"
      : heroType === "carousel"
        ? "carousel"
        : heroType === "split"
          ? "split"
          : heroType === "fullscreen-image" || heroType === "static"
            ? "overlay"
            : "overlay";

  const heroPanels = analysis?.hero?.panels;
  const scrapedHeroImages = dom.scrapedImages?.hero ?? [];
  let heroSlides: Array<{ heading: string; subheading: string; ctaText: string; ctaHref: string; imageQuery?: string; backgroundImage?: string }> | undefined;

  if (heroLayout === "multi-panel" && heroPanels?.length) {
    heroSlides = heroPanels.map((p, i) => ({
      heading: p.heading,
      subheading: "",
      ctaText: p.ctaText,
      ctaHref: "#shop",
      imageQuery: p.imageDescription,
      backgroundImage: scrapedHeroImages[i],
    }));
  } else if ((heroLayout === "carousel" || heroLayout === "overlay") && scrapedHeroImages.length >= 2) {
    heroSlides = scrapedHeroImages.slice(0, 5).map((img, i) => ({
      heading: i === 0 ? heroHeading : `${heroHeading} ${i + 1}`,
      subheading: dom.hero.subheading ?? "",
      ctaText: heroCta,
      ctaHref: dom.hero.ctaHref?.startsWith("http") ? "#shop" : (dom.hero.ctaHref ?? "#"),
      imageQuery: heroImageDesc,
      backgroundImage: img,
    }));
  } else if (heroLayout === "overlay" && scrapedHeroImages.length === 1) {
    heroSlides = undefined;
  }

  sections.push({
    type: "hero",
    props: {
      heading: heroHeading,
      subheading: dom.hero.subheading ?? "",
      ctaText: heroCta,
      ctaHref: dom.hero.ctaHref?.startsWith("http") ? "#shop" : (dom.hero.ctaHref ?? "#"),
      heroLayout,
      ctaVariant: analysis?.hero?.ctaStyle === "outlined" ? "outlined" : "accent",
      imageQuery: heroImageDesc,
      backgroundImage: scrapedHeroImages[0],
      ...(heroSlides?.length ? { slides: heroSlides } : {}),
    },
  });

  if (analysis?.logoCloud?.logos?.length) {
    sections.push({
      type: "logo-cloud",
      props: {
        heading: analysis.logoCloud.heading ?? "As featured in",
        logos: analysis.logoCloud.logos.map((l) => ({ name: l.name, imageQuery: l.imageQuery })),
      },
    });
  }

  const gridSections = dom.sections.filter((s) => s.type === "grid" || s.content.toLowerCase().includes("product"));
  const isEcommerce = analysis?.industry === "e-commerce" || gridSections.length > 0;

  if (gridSections.length > 0 || isEcommerce) {
    const extracted = extractProductNamesFromSections(dom.sections, brand);
    const products =
      extracted.length > 0
        ? extracted
        : Array.from({ length: 6 }, (_, i) => ({
            name: `Product ${i + 1}`,
            category: "Product",
            price: "—",
            imageQuery: `${brand} product`,
          }));

    sections.push({
      type: "product-grid",
      props: {
        heading: "Featured Products",
        subheading: "",
        products: products.slice(0, 8),
      },
    });
  }

  const gallerySection = analysis?.sections?.find((s) => s.type === "gallery" || s.description?.toLowerCase().includes("gallery") || s.description?.toLowerCase().includes("image grid"));
  const hasGalleryContent = gallerySection || dom.sections.some((s) => (s.content.toLowerCase().includes("event") || s.content.toLowerCase().includes("decor")) && (s.images?.length ?? 0) >= 3);
  if (hasGalleryContent) {
    const scrapedUrls = dom.sections.flatMap((s) => s.images ?? []).slice(0, 9);
    const context = gallerySection?.description ?? dom.sections.find((s) => s.content.toLowerCase().includes("event"))?.content?.slice(0, 50) ?? "gallery";
    const galleryImages = scrapedUrls.length >= 6
      ? scrapedUrls.map((url, i) => ({ alt: `Image ${i + 1}`, imageQuery: `${brand} ${context} image`, src: url }))
      : Array.from({ length: 9 }, (_, i) => ({
          alt: `Image ${i + 1}`,
          imageQuery: `${brand} ${context} event decor image`,
        }));
    sections.push({
      type: "gallery",
      props: {
        heading: gallerySection?.description?.split(" ")[0] ?? "Gallery",
        subheading: gallerySection?.description ?? "",
        images: galleryImages,
      },
    });
  }

  const featureSections = dom.sections.filter((s) => s.type === "features" || s.content.toLowerCase().includes("feature"));
  if (featureSections.length > 0) {
    sections.push({
      type: "features",
      props: {
        heading: "Why Choose Us",
        subheading: "",
        features: [
          { title: "Quality", description: "Premium quality products", icon: "star" },
          { title: "Fast Delivery", description: "Quick shipping", icon: "truck" },
          { title: "Support", description: "24/7 customer support", icon: "shield" },
        ],
      },
    });
  }

  const aboutSection = analysis?.sections?.find(
    (s) =>
      s.type === "about" ||
      s.description?.toLowerCase().includes("about us") ||
      s.description?.toLowerCase().includes("split layout") ||
      s.description?.toLowerCase().includes("image one side") ||
      s.description?.toLowerCase().includes("image left") ||
      s.description?.toLowerCase().includes("tale") ||
      s.description?.toLowerCase().includes("story"),
  );
  const aboutDomSection = dom.sections.find(
    (s) =>
      s.content.toLowerCase().includes("about") ||
      s.content.toLowerCase().includes("tale") ||
      s.content.toLowerCase().includes("story") ||
      (s.content.length > 150 && (s.images?.length ?? 0) >= 1),
  );
  if (aboutSection || aboutDomSection) {
    const content = aboutDomSection?.content ?? aboutSection?.description ?? "";
    const firstPara = content.split(/\n\n/)[0]?.slice(0, 300) || `Discover the story behind ${brand}.`;
    const aboutImages = aboutDomSection?.images ?? dom.scrapedImages?.hero ?? dom.scrapedImages?.products ?? [];
    const firstImage = aboutImages[0];
    sections.push({
      type: "split-content",
      props: {
        heading: analysis?.sections?.find((s) => s.description?.toLowerCase().includes("tale"))?.description?.split(" ").slice(0, 4).join(" ") ?? `${brand} Tale`,
        subheading: "",
        body: firstPara,
        imageQuery: `${brand} about us product image`,
        imageUrl: firstImage,
        imagePosition: "left",
        ctaText: "Learn More",
        ctaHref: "#about",
      },
    });
  }

  const toFooterHref = (label: string, href: string) =>
    href?.startsWith("http") ? toInternalHref(label, href) : (href ?? "#");

  sections.push({
    type: "footer",
    props: {
      brand,
      links: dom.footer.links.slice(0, 6).map((l) => ({
        label: l.label,
        href: toFooterHref(l.label, l.href ?? "#"),
      })),
      copyright: dom.footer.copyright ?? `© ${new Date().getFullYear()} ${brand}. All rights reserved.`,
    },
  });

  return {
    title: brand,
    description: `${brand} - ${heroHeading}`,
    theme: {
      mode: isLight ? "light" : "dark",
      primaryColor: primary,
      accentColor: accent,
      fontFamily: toSpecificFont(analysis?.typography?.headingFont),
      logoFontFamily: analysis?.typography?.logoFont ? toSpecificFont(analysis.typography.logoFont) : undefined,
      logoWeight: analysis?.typography?.logoWeight,
      logoLetterSpacing: analysis?.typography?.logoLetterSpacing,
      headingWeight: analysis?.typography?.headingWeight,
      headingLetterSpacing: analysis?.typography?.headingLetterSpacing,
      navWeight: analysis?.typography?.navWeight,
      navLetterSpacing: analysis?.typography?.navLetterSpacing,
    },
    sections,
  };
}
