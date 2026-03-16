/**
 * Design Enforcer — Force layout to match source website design
 *
 * After the planner may have output a generic template, we OVERRIDE
 * theme, navbar, hero with the actual scraped/analyzed data so the
 * output looks similar to the source URL.
 */

import type { WebsiteLayout } from "@/lib/schema/website-layout";
import type { DOMStructure, CSSTokens, NavLinkWithChildren } from "./url-pipeline";
import type { UIAnalysis } from "@/lib/agents/vision-analyzer";
import { toSpecificFont } from "@/lib/utils/fonts";

/** Group flat nav links into ~5 main items with dropdown sub-pages. E.g. SHOP BY COLLECTIONS → New Collection, Flowers In A Box, etc. */
function groupFlatNavIntoHierarchy(
  flat: NavLinkWithChildren[],
): NavLinkWithChildren[] {
  const PARENTS = ["shop by collections", "collections", "home", "shop by occasions", "occasions", "floral decor", "choose your city", "shop"];
  const result: NavLinkWithChildren[] = [];
  let collectUnder: { label: string; href: string } | null = null;
  let children: Array<{ label: string; href: string }> = [];

  const isParent = (norm: string) => PARENTS.some((p) => norm === p || norm.includes(p) || p.includes(norm));

  const toLink = (l: NavLinkWithChildren) => ({ label: typeof l === "string" ? l : (l as { label: string }).label, href: typeof l === "string" ? "#" : (l as { href?: string }).href ?? "#" });

  if (flat.length >= 8 && !flat.some((l) => isParent((typeof l === "string" ? l : (l as { label: string }).label).toLowerCase()))) {
    const homeIdx = flat.findIndex((l) => (typeof l === "string" ? l : (l as { label: string }).label).toLowerCase().includes("home"));
    const collections = flat.slice(0, homeIdx >= 0 ? homeIdx : 5);
    const occasions = flat.slice(homeIdx >= 0 ? homeIdx + 1 : 5);
    if (collections.length > 0) {
      const collChildren = collections.slice(0, 6).map(toLink);
      result.push({ label: "Collections", href: "#", children: collChildren });
    }
    if (homeIdx >= 0) result.push(toLink(flat[homeIdx]));
    if (occasions.length > 0) {
      const occChildren = occasions.slice(0, 6).map(toLink);
      result.push({ label: "Occasions", href: "#", children: occChildren });
    }
    return result.slice(0, 12);
  }

  for (const l of flat) {
    const label = (typeof l === "string" ? l : (l as { label: string }).label)?.trim() || "";
    const href = typeof l === "string" ? "#" : (l as { href?: string }).href ?? "#";
    const norm = label.toLowerCase();

    if (isParent(norm)) {
      if (collectUnder && children.length > 0) {
        result.push({ ...collectUnder, children: [...children] });
        children = [];
      } else if (collectUnder) {
        result.push(collectUnder);
      }
      if (norm === "home") {
        result.push({ label, href });
        collectUnder = null;
      } else {
        collectUnder = { label, href };
      }
    } else if (collectUnder) {
      children.push({ label, href });
    } else {
      result.push({ label, href });
    }
  }
  if (collectUnder) {
    result.push(children.length > 0 ? { ...collectUnder, children } : collectUnder);
  }
  return result.slice(0, 12);
}

export function enforceSourceDesign(
  layout: WebsiteLayout,
  dom: DOMStructure,
  cssTokens: CSSTokens,
  analysis: UIAnalysis | null,
): WebsiteLayout {
  const brand = analysis?.brandName ?? dom.nav.brand ?? layout.title;
  const colors = (analysis?.colorScheme ?? cssTokens.colors) as Record<string, string | undefined>;
  const primaryColor = cssTokens.colors?.primary ?? colors?.text ?? colors?.accent ?? "#0a0a0a";
  const accentColor = colors?.accent ?? cssTokens.colors?.accent ?? "#f97316";
  const bg = colors?.background ?? cssTokens.colors?.background ?? "#ffffff";
  const isLight =
    /^#([fFeEdDcCbBaA]|[0-9a-fA-F]{2}[fFeEdDcCbBaA])/.test(bg) ||
    bg === "#fff" ||
    bg === "#ffffff";

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
  let rawLinks = dom.nav.links;
  const hasAnyChildren = rawLinks.some((l) => typeof l === "object" && "children" in l && (l as { children?: unknown[] }).children?.length);
  if (!hasAnyChildren && rawLinks.length > 6) {
    rawLinks = groupFlatNavIntoHierarchy(rawLinks);
  }
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

  const heroHeading = analysis?.hero?.headingText ?? dom.hero.heading;
  const heroCta = analysis?.hero?.ctaButtonText ?? dom.hero.ctaText;
  const heroSubheading = dom.hero.subheading;
  const hasHeroImage = (dom.scrapedImages?.hero?.length ?? 0) > 0;
  let heroLayout: "carousel" | "overlay" | "split" | "centered" | "multi-panel" =
    analysis?.hero?.type === "multi-panel" && (analysis?.hero?.panels?.length ?? 0) >= 2
      ? "multi-panel"
      : analysis?.hero?.type === "carousel"
        ? "carousel"
        : analysis?.hero?.type === "split"
          ? "split"
          : analysis?.hero?.type === "fullscreen-image" || hasHeroImage
            ? "overlay"
            : "overlay";
  const ctaVariant = analysis?.hero?.ctaStyle === "outlined" ? "outlined" : "accent";

  let result = { ...layout };

  result = {
    ...result,
    title: brand,
    description: `${brand} - ${heroHeading ?? layout.description}`,
    theme: {
      ...result.theme,
      mode: isLight ? "light" : "dark",
      primaryColor,
      accentColor,
      fontFamily: analysis?.typography?.headingFont ? toSpecificFont(analysis.typography.headingFont) : (result.theme.fontFamily ?? "Space Grotesk"),
      ...(analysis?.typography?.logoFont ? { logoFontFamily: toSpecificFont(analysis.typography.logoFont) } : {}),
      logoWeight: analysis?.typography?.logoWeight ?? result.theme.logoWeight,
      logoLetterSpacing: analysis?.typography?.logoLetterSpacing ?? result.theme.logoLetterSpacing,
      headingWeight: analysis?.typography?.headingWeight ?? result.theme.headingWeight,
      headingLetterSpacing: analysis?.typography?.headingLetterSpacing ?? result.theme.headingLetterSpacing,
      navWeight: analysis?.typography?.navWeight ?? result.theme.navWeight,
      navLetterSpacing: analysis?.typography?.navLetterSpacing ?? result.theme.navLetterSpacing,
    },
  };

  const navIdx = result.sections.findIndex((s) => s.type === "navbar");
  if (navIdx >= 0 && result.sections[navIdx].type === "navbar") {
    result = {
      ...result,
      sections: result.sections.map((s, i) =>
        i === navIdx && s.type === "navbar"
          ? {
              ...s,
              props: {
                ...s.props,
                brand,
                links: navLinks.slice(0, 12),
                navStyle: analysis?.navbar?.layout ?? s.props.navStyle ?? "default",
                logoStyle: analysis?.navbar?.logoStyle ?? (analysis?.navbar?.layout === "centered" ? "text" : s.props.logoStyle ?? "icon"),
                logoImageQuery: analysis?.navbarLogoImageQuery ?? `${brand} logo`,
                hasCart: analysis?.navbar?.hasCart ?? dom.nav.hasCart ?? s.props.hasCart,
                hasSearch: analysis?.navbar?.hasSearch ?? dom.nav.hasSearch ?? s.props.hasSearch,
                hasAccount: analysis?.navbar?.hasAccount ?? dom.nav.hasAccount ?? s.props.hasAccount,
                currencySelector: dom.nav.currencySelector ?? s.props.currencySelector,
              },
            }
          : s,
      ),
    };
  }

  const heroIdx = result.sections.findIndex((s) => s.type === "hero");
  if (heroIdx >= 0 && result.sections[heroIdx].type === "hero") {
    const heroProps = result.sections[heroIdx].props;
    result = {
      ...result,
      sections: result.sections.map((s, i) =>
        i === heroIdx && s.type === "hero"
          ? {
              ...s,
              props: {
                ...heroProps,
                heading: heroHeading ?? heroProps.heading ?? "Welcome",
                subheading: heroSubheading ?? heroProps.subheading ?? "",
                ctaText: heroCta ?? heroProps.ctaText ?? "Get Started",
                ctaHref: dom.hero.ctaHref?.startsWith("http") ? "#shop" : (dom.hero.ctaHref ?? heroProps.ctaHref ?? "#"),
                heroLayout,
                ctaVariant,
              },
            }
          : s,
      ),
    };
  }

  const footerIdx = result.sections.findIndex((s) => s.type === "footer");
  if (footerIdx >= 0 && result.sections[footerIdx].type === "footer") {
    const toFooterHref = (label: string, href: string) =>
      href?.startsWith("http") ? toInternalHref(label, href) : (href ?? "#");
    result = {
      ...result,
      sections: result.sections.map((s, i) =>
        i === footerIdx && s.type === "footer"
          ? {
              ...s,
              props: {
                ...s.props,
                brand,
                links: dom.footer.links.slice(0, 6).map((l) => ({
                  label: l.label,
                  href: toFooterHref(l.label, l.href ?? "#"),
                })),
                copyright: dom.footer.copyright ?? `© ${new Date().getFullYear()} ${brand}. All rights reserved.`,
              },
            }
          : s,
      ),
    };
  }

  return result;
}
