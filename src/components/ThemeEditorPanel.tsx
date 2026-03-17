"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { usePreviewEdit } from "./PreviewEditContext";
import {
  DndContext,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragEndEvent,
} from "@dnd-kit/core";
import { arrayMove, SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  FONT_OPTIONS,
  FONT_SIZE_PRESETS,
  MIN_FONT_SIZE,
  MAX_FONT_SIZE,
} from "@/lib/utils/fonts";
import type { Section } from "@/lib/schema/website-layout";
import { AddSectionPanel } from "./AddSectionPanel";

const HERO_LAYOUT_OPTIONS = [
  { value: "overlay", label: "Overlay (centered on image)" },
  { value: "split", label: "Split (heading left, image right)" },
  { value: "carousel", label: "Carousel (multiple slides)" },
  { value: "centered", label: "Centered (no image)" },
  { value: "multi-panel", label: "Multi-panel (grid)" },
] as const;

const NAV_STYLE_OPTIONS = [
  { value: "default", label: "Default (logo left)" },
  { value: "centered", label: "Centered (logo top)" },
  { value: "sidebar", label: "Sidebar (hamburger menu)" },
] as const;

const LOGO_STYLE_OPTIONS = [
  { value: "text", label: "Text only" },
  { value: "icon_only", label: "Icon only" },
  { value: "icon", label: "Icon + text" },
  { value: "image", label: "Image (custom logo)" },
] as const;

const SIDEBAR_ICONS: Array<{ value: string; label: string; stroke?: boolean; d?: string; circles?: Array<{ cx: number; cy: number; r: number }> }> = [
  { value: "hamburger", label: "Hamburger", stroke: true, d: "M4 6h16M4 12h16M4 18h16" },
  { value: "dots", label: "Dots", stroke: false, circles: [{ cx: 5, cy: 12, r: 1.5 }, { cx: 12, cy: 12, r: 1.5 }, { cx: 19, cy: 12, r: 1.5 }] },
  { value: "grid", label: "Grid", stroke: true, d: "M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 14a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zM14 14a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" },
  { value: "kebab", label: "Kebab", stroke: false, circles: [{ cx: 12, cy: 5, r: 1.5 }, { cx: 12, cy: 12, r: 1.5 }, { cx: 12, cy: 19, r: 1.5 }] },
  { value: "menu", label: "Menu", stroke: true, d: "M4 6h16M4 12h16M4 18h16" },
  { value: "list", label: "List", stroke: true, d: "M4 6h16M4 10h16M4 14h16M4 18h16" },
  { value: "plus", label: "Plus", stroke: true, d: "M12 4v16M4 12h16" },
];

const HEADER_ELEMENT_LABELS: Record<string, string> = {
  logo: "Logo",
  nav: "Nav links",
  sidebar: "Sidebar",
  cta: "CTA button",
};

const PRESET_COLORS = [
  "#0a0a0a", "#ffffff", "#f97316", "#ef4444", "#22c55e", "#3b82f6",
  "#8b5cf6", "#ec4899", "#f59e0b", "#14b8a6", "#6366f1", "#64748b",
];

function SortableHeaderItem({
  id,
  label,
  onRemove,
  canRemove,
}: {
  id: string;
  label: string;
  onRemove?: (id: string) => void;
  canRemove?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = { transform: CSS.Transform.toString(transform), transition };
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-2 rounded-lg border border-white/20 bg-white/5 px-2 py-1.5 text-xs transition-colors hover:bg-white/10 ${isDragging ? "opacity-50" : ""}`}
      {...attributes}
      {...listeners}
    >
      <span className="cursor-grab text-white/50 active:cursor-grabbing">≡</span>
      <span className="flex-1 text-white/90">{label}</span>
      {canRemove && onRemove && (
        <button
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onRemove(id);
          }}
          className="-mr-1 rounded p-0.5 text-white/50 transition-colors hover:bg-red-500/30 hover:text-red-400"
          title="Remove from header"
          aria-label={`Remove ${label}`}
        >
          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
}

export function ThemeEditorPanel() {
  const ctx = usePreviewEdit();
  const [accentColor, setAccentColor] = useState("#f97316");
  const [textColor, setTextColor] = useState("#0a0a0a");
  const [backgroundColor, setBackgroundColor] = useState("#ffffff");
  const [fontFamily, setFontFamily] = useState("Inter");
  const [logoFontFamily, setLogoFontFamily] = useState("Inter");
  const [headingFontSize, setHeadingFontSize] = useState(24);
  const [bodyFontSize, setBodyFontSize] = useState(16);
  const [heroLayout, setHeroLayout] = useState("split");
  const [navStyle, setNavStyle] = useState("default");
  const [logoStyle, setLogoStyle] = useState("icon");
  const [showNavBorder, setShowNavBorder] = useState(true);
  const [showLogoDivider, setShowLogoDivider] = useState(false);
  const [headerOrder, setHeaderOrder] = useState<("logo" | "nav" | "sidebar" | "cta")[]>(["logo", "nav", "cta"]);
  const [sidebarPosition, setSidebarPosition] = useState<"left" | "right">("left");
  const [logoPosition, setLogoPosition] = useState<"left" | "center" | "right">("left");
  const [sidebarIcon, setSidebarIcon] = useState("hamburger");
  const [logoHeight, setLogoHeight] = useState<number | "">(32);
  const [logoWidth, setLogoWidth] = useState<number | "">(140);
  const [showAddSection, setShowAddSection] = useState(false);

  const layoutForLanding = ctx?.layoutForTheme ?? ctx?.layout;
  const onUpdateLanding = ctx?.onUpdateHome ?? ctx?.onUpdate;
  const currentPageLayout = ctx?.layout;
  const onUpdateCurrentPage = ctx?.onUpdate;

  const { navIndex, heroIndex } = useMemo(() => {
    const landingSections = layoutForLanding?.sections ?? [];
    const currentSections = currentPageLayout?.sections ?? [];
    return {
      navIndex: landingSections.findIndex((s: Section) => s.type === "navbar"),
      heroIndex: currentSections.findIndex((s: Section) => s.type === "hero"),
    };
  }, [layoutForLanding?.sections, currentPageLayout?.sections]);

  const legacyFontMap: Record<string, string> = {
    "sans-serif": "Inter",
    serif: "Playfair Display",
    mono: "Courier New",
  };
  const legacySizeMap: Record<string, number> = {
    small: 14,
    medium: 16,
    large: 20,
  };
  const legacyHeadingSizeMap: Record<string, number> = {
    small: 20,
    medium: 24,
    large: 32,
  };

  useEffect(() => {
    if (layoutForLanding?.theme) {
      const t = layoutForLanding.theme;
      setAccentColor(t.accentColor || "#f97316");
      setTextColor((t as { textColor?: string }).textColor ?? (t.mode === "dark" ? "#f5f5f5" : "#0a0a0a"));
      setBackgroundColor((t as { backgroundColor?: string }).backgroundColor ?? (t.mode === "dark" ? "#0a0a0a" : "#ffffff"));
      const ff = (t.fontFamily as string) || "sans-serif";
      setFontFamily(legacyFontMap[ff] ?? (FONT_OPTIONS.some((o) => o.value === ff) ? ff : "Inter"));
      const lf = (t.logoFontFamily as string) || "sans-serif";
      setLogoFontFamily(legacyFontMap[lf] ?? (FONT_OPTIONS.some((o) => o.value === lf) ? lf : "Inter"));
      const hfs = (t as { headingFontSize?: string }).headingFontSize;
      if (hfs) {
        const n = parseInt(hfs, 10);
        setHeadingFontSize(!Number.isNaN(n) ? n : legacyHeadingSizeMap[hfs] ?? 24);
      }
      const bfs = (t as { bodyFontSize?: string }).bodyFontSize;
      if (bfs) {
        const n = parseInt(bfs, 10);
        setBodyFontSize(!Number.isNaN(n) ? n : legacySizeMap[bfs] ?? 16);
      }
    }
  }, [layoutForLanding?.theme]);

  useEffect(() => {
    const sections = layoutForLanding?.sections ?? [];
    const nav = sections.find((s: Section) => s.type === "navbar");
    if (nav && nav.type === "navbar") {
      setNavStyle(nav.props.navStyle ?? "default");
      setLogoStyle(nav.props.logoStyle ?? "icon");
      setShowNavBorder((nav.props as { showBorder?: boolean }).showBorder !== false);
      setShowLogoDivider((nav.props as { showLogoDivider?: boolean }).showLogoDivider === true);
      const ho = (nav.props as { headerOrder?: ("logo" | "nav" | "sidebar" | "cta")[] }).headerOrder;
      setHeaderOrder(ho ?? (nav.props.navStyle === "sidebar" ? ["logo", "sidebar", "cta"] : ["logo", "nav", "cta"]));
      setSidebarIcon((nav.props as { sidebarIcon?: string }).sidebarIcon ?? "hamburger");
      const sp = (nav.props as { sidebarPosition?: "left" | "right" }).sidebarPosition;
      setSidebarPosition(sp ?? "left");
      const lp = (nav.props as { logoPosition?: "left" | "center" | "right" }).logoPosition;
      setLogoPosition(lp ?? "left");
      const lh = (nav.props as { logoHeight?: number }).logoHeight;
      const lw = (nav.props as { logoWidth?: number }).logoWidth;
      setLogoHeight(lh != null ? lh : 32);
      setLogoWidth(lw != null ? lw : 140);
    }
  }, [layoutForLanding?.sections]);

  useEffect(() => {
    const currentSections = currentPageLayout?.sections ?? [];
    const hero = currentSections.find((s: Section) => s.type === "hero");
    if (hero && hero.type === "hero") {
      setHeroLayout(hero.props.heroLayout ?? "split");
    }
  }, [currentPageLayout?.sections]);

  if (!ctx?.editable) return null;

  const applyTheme = (updates: Record<string, unknown>) => {
    if (!layoutForLanding || !onUpdateLanding) return;
    const theme = { ...layoutForLanding.theme, ...updates };
    onUpdateLanding("theme", theme);
  };

  const updateNavProps = useCallback(
    (key: string, value: unknown) => {
      if (navIndex < 0 || !layoutForLanding || !onUpdateLanding) return;
      const nav = layoutForLanding.sections[navIndex];
      if (nav.type !== "navbar") return;
      const updated = { ...nav.props, [key]: value };
      onUpdateLanding(`sections.${navIndex}.props`, updated);
    },
    [layoutForLanding, onUpdateLanding, navIndex],
  );

  const updateNavPropsBatch = useCallback(
    (updates: Record<string, unknown>) => {
      if (navIndex < 0 || !layoutForLanding || !onUpdateLanding) return;
      const nav = layoutForLanding.sections[navIndex];
      if (nav.type !== "navbar") return;
      const updated = { ...nav.props, ...updates };
      onUpdateLanding(`sections.${navIndex}.props`, updated);
    },
    [layoutForLanding, onUpdateLanding, navIndex],
  );

  const updateHeroProps = useCallback(
    (key: string, value: unknown) => {
      if (heroIndex < 0 || !currentPageLayout || !onUpdateCurrentPage) return;
      const hero = currentPageLayout.sections[heroIndex];
      if (hero.type !== "hero") return;
      let updated = { ...hero.props, [key]: value };

      if (key === "heroLayout" && (value === "carousel" || value === "multi-panel")) {
        const slides = hero.props.slides ?? [];
        const hasMultiSlide = slides.length > 1;
        if (!hasMultiSlide) {
          const baseSlide = slides[0] ?? {
            badge: hero.props.badge,
            heading: hero.props.heading ?? "Welcome",
            subheading: hero.props.subheading ?? "",
            ctaText: hero.props.ctaText ?? "Get Started",
            ctaHref: hero.props.ctaHref ?? "#",
            secondaryCtaText: hero.props.secondaryCtaText,
            secondaryCtaHref: hero.props.secondaryCtaHref,
            backgroundImage: hero.props.backgroundImage,
            imageQuery: hero.props.imageQuery,
          };
          const slide2 = {
            ...baseSlide,
            heading: "Discover More",
            subheading: "Explore our latest collection and top picks",
            imageQuery: baseSlide.imageQuery ? `${baseSlide.imageQuery} collection` : "product showcase",
          };
          const slide3 = {
            ...baseSlide,
            heading: "New Arrivals",
            subheading: "Check out the newest additions to our lineup",
            imageQuery: baseSlide.imageQuery ? `${baseSlide.imageQuery} new arrival` : "new products",
          };
          updated = { ...updated, slides: [baseSlide, slide2, slide3] };
        }
      }

      onUpdateCurrentPage(`sections.${heroIndex}.props`, updated);
    },
    [heroIndex, currentPageLayout, onUpdateCurrentPage],
  );

  const hasLandingControls = navIndex >= 0 || heroIndex >= 0;

  const defaultOrder = navStyle === "sidebar" ? ["logo", "sidebar", "cta"] : ["logo", "nav", "cta"];
  const headerItems = useMemo(() => {
    const valid = headerOrder.filter((x) => defaultOrder.includes(x));
    return valid.length > 0 ? valid : defaultOrder;
  }, [headerOrder, navStyle]);

  const handleHeaderOrderDragEnd = useCallback(
    (e: DragEndEvent) => {
      const { active, over } = e;
      if (!over || active.id === over.id || navIndex < 0) return;
      const items = [...headerItems];
      const oldIdx = items.indexOf(active.id as "logo" | "nav" | "sidebar" | "cta");
      const newIdx = items.indexOf(over.id as "logo" | "nav" | "sidebar" | "cta");
      if (oldIdx < 0 || newIdx < 0) return;
      const reordered = arrayMove(items, oldIdx, newIdx);
      const fullOrder = navStyle === "sidebar"
        ? reordered
        : reordered.map((x) => (x === "sidebar" ? "nav" : x));
      setHeaderOrder(fullOrder);
      updateNavProps("headerOrder", fullOrder);
    },
    [headerItems, navIndex, navStyle, updateNavProps],
  );

  const handleRemoveHeaderItem = useCallback(
    (id: string) => {
      if (id === "sidebar") {
        setNavStyle("default");
        const newOrder = headerOrder.map((x) => (x === "sidebar" ? "nav" : x));
        setHeaderOrder(newOrder);
        updateNavPropsBatch({ navStyle: "default", headerOrder: newOrder });
      } else if (id === "cta") {
        const newOrder = headerOrder.filter((x) => x !== "cta");
        const fallback = navStyle === "sidebar" ? ["logo", "sidebar"] : ["logo", "nav"];
        const finalOrder = newOrder.length > 0 ? newOrder : fallback;
        setHeaderOrder(finalOrder);
        updateNavProps("headerOrder", finalOrder);
      }
    },
    [headerOrder, navStyle, updateNavProps, updateNavPropsBatch],
  );

  const setLogoPositionFromOrder = useCallback(
    (position: "left" | "center" | "right") => {
      const items = [...headerItems];
      const logoIdx = items.indexOf("logo");
      if (logoIdx < 0) return;
      const others = items.filter((x) => x !== "logo");
      let newOrder: ("logo" | "nav" | "sidebar" | "cta")[];
      if (position === "left") {
        newOrder = ["logo", ...others];
      } else if (position === "right") {
        newOrder = [...others, "logo"];
      } else {
        const mid = Math.floor(others.length / 2);
        newOrder = [...others.slice(0, mid), "logo", ...others.slice(mid)];
      }
      setHeaderOrder(newOrder);
      updateNavProps("headerOrder", newOrder);
    },
    [headerItems, updateNavProps],
  );

  const logoPositionFromOrder = useMemo(() => {
    const idx = headerItems.indexOf("logo");
    if (idx <= 0) return "left";
    if (idx >= headerItems.length - 1) return "right";
    return "center";
  }, [headerItems]);

  const handleAddHeaderItem = useCallback(
    (id: "sidebar" | "cta") => {
      if (id === "sidebar" && navStyle === "default") {
        setNavStyle("sidebar");
        setSidebarPosition("left");
        setLogoPosition("left");
        const newOrder = headerOrder.map((x) => (x === "nav" ? "sidebar" : x));
        const hasSidebar = newOrder.includes("sidebar");
        const finalOrder = hasSidebar ? newOrder : ["logo", "sidebar", "cta"];
        setHeaderOrder(finalOrder);
        updateNavPropsBatch({ navStyle: "sidebar", headerOrder: finalOrder, sidebarPosition: "left", logoPosition: "left" });
      } else if (id === "cta" && !headerOrder.includes("cta")) {
        const insertIdx = headerOrder.length;
        const newOrder = [...headerOrder.slice(0, insertIdx), "cta"];
        setHeaderOrder(newOrder);
        updateNavProps("headerOrder", newOrder);
      }
    },
    [headerOrder, navStyle, updateNavProps, updateNavPropsBatch],
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 3 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } }),
  );

  return (
    <div className="rounded-xl border border-white/20 bg-[#1a1a1a] p-4 pb-20 shadow-xl">
      <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-white">
        <svg className="h-4 w-4 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
        </svg>
        Theme
      </h3>
      <div className="space-y-4">
        <div>
          <p className="mb-1.5 text-xs font-medium uppercase tracking-wider text-white/70">Fonts</p>
          <div className="space-y-1.5">
            <div>
              <span className="text-[10px] text-white/50">Body</span>
              <select
                value={fontFamily}
                onChange={(e) => {
                  const v = e.target.value;
                  setFontFamily(v);
                  applyTheme({ fontFamily: v });
                }}
                className="mt-0.5 w-full rounded-md border border-white/20 bg-white/10 px-2 py-1.5 text-xs text-white focus:border-orange-500 focus:outline-none"
              >
                {FONT_OPTIONS.map((f) => (
                  <option key={f.value} value={f.value} className="bg-[#1a1a1a] text-white">
                    {f.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <span className="text-[10px] text-white/50">Logo</span>
              <select
                value={logoFontFamily}
                onChange={(e) => {
                  const v = e.target.value;
                  setLogoFontFamily(v);
                  applyTheme({ logoFontFamily: v });
                }}
                className="mt-0.5 w-full rounded-md border border-white/20 bg-white/10 px-2 py-1.5 text-xs text-white focus:border-orange-500 focus:outline-none"
              >
                {FONT_OPTIONS.map((f) => (
                  <option key={f.value} value={f.value} className="bg-[#1a1a1a] text-white">
                    {f.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <span className="text-[10px] text-white/50">Logo (site name)</span>
              <div className="mt-0.5 space-y-1">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      const v = Math.max(MIN_FONT_SIZE, headingFontSize - 2);
                      setHeadingFontSize(v);
                      applyTheme({ headingFontSize: String(v) });
                    }}
                    className="rounded bg-white/10 px-2 py-1 text-xs text-white/80 hover:bg-white/15"
                  >
                    −
                  </button>
                  <input
                    type="number"
                    min={MIN_FONT_SIZE}
                    max={MAX_FONT_SIZE}
                    value={headingFontSize}
                    onChange={(e) => {
                      const n = parseInt(e.target.value, 10);
                      if (!Number.isNaN(n)) {
                        const v = Math.min(MAX_FONT_SIZE, Math.max(MIN_FONT_SIZE, n));
                        setHeadingFontSize(v);
                        applyTheme({ headingFontSize: String(v) });
                      }
                    }}
                    className="w-12 rounded border border-white/20 bg-white/10 px-1.5 py-1 text-center text-xs text-white [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const v = Math.min(MAX_FONT_SIZE, headingFontSize + 2);
                      setHeadingFontSize(v);
                      applyTheme({ headingFontSize: String(v) });
                    }}
                    className="rounded bg-white/10 px-2 py-1 text-xs text-white/80 hover:bg-white/15"
                  >
                    +
                  </button>
                </div>
                <div className="flex flex-wrap gap-0.5">
                  {FONT_SIZE_PRESETS.map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => {
                        setHeadingFontSize(p);
                        applyTheme({ headingFontSize: String(p) });
                      }}
                      className={`rounded px-1.5 py-0.5 text-[10px] transition-colors ${
                        headingFontSize === p ? "bg-orange-500 text-white" : "bg-white/10 text-white/80 hover:bg-white/15"
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div>
              <span className="text-[10px] text-white/50">Nav links</span>
              <div className="mt-0.5 space-y-1">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      const v = Math.max(MIN_FONT_SIZE, bodyFontSize - 2);
                      setBodyFontSize(v);
                      applyTheme({ bodyFontSize: String(v) });
                    }}
                    className="rounded bg-white/10 px-2 py-1 text-xs text-white/80 hover:bg-white/15"
                  >
                    −
                  </button>
                  <input
                    type="number"
                    min={MIN_FONT_SIZE}
                    max={MAX_FONT_SIZE}
                    value={bodyFontSize}
                    onChange={(e) => {
                      const n = parseInt(e.target.value, 10);
                      if (!Number.isNaN(n)) {
                        const v = Math.min(MAX_FONT_SIZE, Math.max(MIN_FONT_SIZE, n));
                        setBodyFontSize(v);
                        applyTheme({ bodyFontSize: String(v) });
                      }
                    }}
                    className="w-12 rounded border border-white/20 bg-white/10 px-1.5 py-1 text-center text-xs text-white [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const v = Math.min(MAX_FONT_SIZE, bodyFontSize + 2);
                      setBodyFontSize(v);
                      applyTheme({ bodyFontSize: String(v) });
                    }}
                    className="rounded bg-white/10 px-2 py-1 text-xs text-white/80 hover:bg-white/15"
                  >
                    +
                  </button>
                </div>
                <div className="flex flex-wrap gap-0.5">
                  {FONT_SIZE_PRESETS.map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => {
                        setBodyFontSize(p);
                        applyTheme({ bodyFontSize: String(p) });
                      }}
                      className={`rounded px-1.5 py-0.5 text-[10px] transition-colors ${
                        bodyFontSize === p ? "bg-orange-500 text-white" : "bg-white/10 text-white/80 hover:bg-white/15"
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
        <div>
          <button
            type="button"
            onClick={() => setShowAddSection((v) => !v)}
            className={`flex w-full items-center justify-between gap-2 rounded-xl border px-3 py-2.5 text-left text-sm font-medium transition-all ${
              showAddSection
                ? "border-orange-500/60 bg-orange-500/15 text-orange-400"
                : "border-white/20 bg-white/5 text-white/90 hover:border-orange-500/40 hover:bg-orange-500/10"
            }`}
          >
            <span className="flex items-center gap-2">
              <span className="text-lg">✎</span>
              Custom section
            </span>
            <span className="text-[10px] text-white/50">{showAddSection ? "▼" : "▶"}</span>
          </button>
          {showAddSection && (
            <div className="mt-3 rounded-xl border border-white/20 bg-black/30 p-3">
              <AddSectionPanel onClose={() => setShowAddSection(false)} />
            </div>
          )}
        </div>
        <div>
          <p className="mb-1.5 text-xs font-medium uppercase tracking-wider text-white/70">Layout</p>
          <p className="text-[10px] text-white/50">Hover over a section and drag the handle to reorder.</p>
        </div>
        {hasLandingControls && (
          <div>
            <p className="mb-1.5 text-xs font-medium uppercase tracking-wider text-white/70">Landing page style</p>
            <div className="space-y-2">
              {heroIndex >= 0 && (
                <>
                  <div>
                    <span className="text-[10px] text-white/50">Hero layout</span>
                    <select
                      value={heroLayout}
                      onChange={(e) => {
                        const v = e.target.value;
                        setHeroLayout(v);
                        updateHeroProps("heroLayout", v);
                      }}
                      className="mt-0.5 w-full rounded-md border border-white/20 bg-white/10 px-2 py-1.5 text-xs text-white focus:border-orange-500 focus:outline-none"
                    >
                      {HERO_LAYOUT_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value} className="bg-[#1a1a1a] text-white">
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="rounded-lg border border-dashed border-orange-500/30 bg-orange-500/5 p-2">
                    <span className="text-[10px] font-medium uppercase tracking-wider text-orange-400/90">Hero image</span>
                    <p className="mt-0.5 text-[10px] text-white/50">Paste URL or search to change image</p>
                    {(() => {
                      const hero = currentPageLayout?.sections[heroIndex];
                      if (hero?.type !== "hero") return null;
                      const slides = hero.props.slides ?? [];
                      const hasSlides = slides.length >= 1;
                      if (hasSlides) {
                        return (
                          <div className="mt-1 space-y-1.5">
                            {slides.map((slide: { backgroundImage?: string; imageQuery?: string; heading?: string }, idx: number) => (
                              <button
                                key={idx}
                                type="button"
                                onClick={() => {
                                  ctx?.openEditor({
                                    path: `sections.${heroIndex}.props.slides.${idx}.backgroundImage`,
                                    value: slide.backgroundImage ?? "",
                                    type: "image",
                                    label: `Slide ${idx + 1} image`,
                                  });
                                }}
                                className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-white/30 bg-white/5 py-2 text-xs text-white/70 transition-colors hover:border-orange-500/50 hover:bg-white/10"
                              >
                                {slide.backgroundImage ? (
                                  <>
                                    <img
                                      src={slide.backgroundImage.startsWith("http") ? `/api/image-proxy?url=${encodeURIComponent(slide.backgroundImage)}` : slide.backgroundImage}
                                      alt={slide.heading ?? `Slide ${idx + 1}`}
                                      className="h-8 w-8 rounded object-cover"
                                    />
                                    <span>Change slide {idx + 1} image</span>
                                  </>
                                ) : (
                                  <>
                                    <span className="text-base opacity-50">&#128247;</span>
                                    <span>Add slide {idx + 1} image</span>
                                  </>
                                )}
                              </button>
                            ))}
                          </div>
                        );
                      }
                      const bgImg = hero.props.backgroundImage;
                      return (
                        <button
                          type="button"
                          onClick={() => {
                            ctx?.openEditor({
                              path: `sections.${heroIndex}.props.backgroundImage`,
                              value: bgImg ?? "",
                              type: "image",
                              label: "Hero image",
                            });
                          }}
                          className="mt-1 flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-white/30 bg-white/5 py-2.5 text-xs text-white/70 transition-colors hover:border-orange-500/50 hover:bg-white/10"
                        >
                          {bgImg ? (
                            <>
                              <img
                                src={bgImg.startsWith("http") ? `/api/image-proxy?url=${encodeURIComponent(bgImg)}` : bgImg}
                                alt="Hero"
                                className="h-8 w-8 rounded object-cover"
                              />
                              <span>Change hero image</span>
                            </>
                          ) : (
                            <>
                              <span className="text-base opacity-50">&#128247;</span>
                              <span>Add hero image (paste URL or search)</span>
                            </>
                          )}
                        </button>
                      );
                    })()}
                  </div>
                </>
              )}
              {navIndex >= 0 && (
                <>
                  <div>
                    <span className="text-[10px] text-white/50">Header layout</span>
                    <select
                      value={navStyle}
                      onChange={(e) => {
                        const v = e.target.value;
                        setNavStyle(v);
                        if (v === "sidebar") {
                          setSidebarPosition("left");
                          setLogoPosition("left");
                          const o = headerOrder.map((x) => (x === "nav" ? "sidebar" : x));
                          const hasSidebar = o.includes("sidebar");
                          const newOrder = hasSidebar ? o : ["logo", "sidebar", "cta"];
                          setHeaderOrder(newOrder);
                          updateNavPropsBatch({ navStyle: v, headerOrder: newOrder, sidebarPosition: "left", logoPosition: "left" });
                        } else {
                          const o = headerOrder.map((x) => (x === "sidebar" ? "nav" : x));
                          const hasNav = o.includes("nav");
                          const newOrder = hasNav ? o : ["logo", "nav", "cta"];
                          setHeaderOrder(newOrder);
                          updateNavPropsBatch({ navStyle: v, headerOrder: newOrder });
                        }
                      }}
                      className="mt-0.5 w-full rounded-md border border-white/20 bg-white/10 px-2 py-1.5 text-xs text-white focus:border-orange-500 focus:outline-none"
                    >
                      {NAV_STYLE_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value} className="bg-[#1a1a1a] text-white">
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  {navStyle === "sidebar" && (
                    <>
                      <div>
                        <span className="text-[10px] text-white/50">Sidebar position</span>
                        <div className="mt-1 flex gap-1">
                          {(["left", "right"] as const).map((pos) => (
                            <button
                              key={pos}
                              type="button"
                              onClick={() => {
                                setSidebarPosition(pos);
                                updateNavProps("sidebarPosition", pos);
                              }}
                              className={`flex-1 rounded px-2 py-1 text-[10px] capitalize transition-colors ${
                                sidebarPosition === pos ? "bg-orange-500 text-white" : "bg-white/10 text-white/80 hover:bg-white/15"
                              }`}
                            >
                              {pos}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <span className="text-[10px] text-white/50">Logo position</span>
                        <div className="mt-1 flex gap-1">
                          {(["left", "center", "right"] as const).map((pos) => (
                            <button
                              key={pos}
                              type="button"
                              onClick={() => {
                                setLogoPosition(pos);
                                updateNavProps("logoPosition", pos);
                              }}
                              className={`flex-1 rounded px-2 py-1 text-[10px] capitalize transition-colors ${
                                logoPosition === pos ? "bg-orange-500 text-white" : "bg-white/10 text-white/80 hover:bg-white/15"
                              }`}
                            >
                              {pos}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="mt-1.5 flex flex-wrap items-center gap-1">
                        <span className="text-[10px] text-white/40">Add:</span>
                        {!headerOrder.includes("cta") ? (
                          <button
                            type="button"
                            onClick={() => handleAddHeaderItem("cta")}
                            className="rounded border border-dashed border-white/30 px-2 py-0.5 text-[10px] text-white/70 transition-colors hover:border-orange-500 hover:text-orange-400"
                          >
                            + CTA button
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleRemoveHeaderItem("cta")}
                            className="rounded border border-dashed border-red-500/50 px-2 py-0.5 text-[10px] text-red-400 transition-colors hover:border-red-500"
                          >
                            − CTA button
                          </button>
                        )}
                      </div>
                    </>
                  )}
                  {navStyle === "default" && (
                    <>
                      <div>
                        <span className="text-[10px] text-white/50">Logo position</span>
                        <div className="mt-1 flex gap-1">
                          {(["left", "center", "right"] as const).map((pos) => (
                            <button
                              key={pos}
                              type="button"
                              onClick={() => setLogoPositionFromOrder(pos)}
                              className={`flex-1 rounded px-2 py-1 text-[10px] capitalize transition-colors ${
                                logoPositionFromOrder === pos ? "bg-orange-500 text-white" : "bg-white/10 text-white/80 hover:bg-white/15"
                              }`}
                            >
                              {pos}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <span className="text-[10px] text-white/50">Header order — drag to reorder (first = left, middle = center, last = right)</span>
                        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleHeaderOrderDragEnd}>
                          <SortableContext items={headerItems} strategy={verticalListSortingStrategy}>
                            <div className="mt-1 space-y-1">
                              {headerItems.map((item) => (
                                <SortableHeaderItem
                                  key={item}
                                  id={item}
                                  label={HEADER_ELEMENT_LABELS[item] ?? item}
                                  canRemove={item === "sidebar" || item === "cta"}
                                  onRemove={handleRemoveHeaderItem}
                                />
                              ))}
                            </div>
                          </SortableContext>
                        </DndContext>
                        <div className="mt-1.5 flex flex-wrap items-center gap-1">
                          <span className="text-[10px] text-white/40">Add:</span>
                          {!headerOrder.includes("sidebar") && (
                            <button
                              type="button"
                              onClick={() => handleAddHeaderItem("sidebar")}
                              className="rounded border border-dashed border-white/30 px-2 py-0.5 text-[10px] text-white/70 transition-colors hover:border-orange-500 hover:text-orange-400"
                            >
                              + Sidebar
                            </button>
                          )}
                          {!headerOrder.includes("cta") && (
                            <button
                              type="button"
                              onClick={() => handleAddHeaderItem("cta")}
                              className="rounded border border-dashed border-white/30 px-2 py-0.5 text-[10px] text-white/70 transition-colors hover:border-orange-500 hover:text-orange-400"
                            >
                              + CTA button
                            </button>
                          )}
                        </div>
                      </div>
                    </>
                  )}
                  {navStyle === "centered" && (
                    <p className="text-[10px] text-white/50">Header order applies to Default/Sidebar layout only.</p>
                  )}
                  {navStyle === "sidebar" && (
                    <div>
                      <span className="text-[10px] text-white/50">Sidebar icon</span>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {SIDEBAR_ICONS.map((ico) => (
                          <button
                            key={ico.value}
                            type="button"
                            onClick={() => {
                              setSidebarIcon(ico.value);
                              updateNavProps("sidebarIcon", ico.value);
                            }}
                            className={`flex h-9 w-9 items-center justify-center rounded-lg border transition-colors ${
                              sidebarIcon === ico.value
                                ? "border-orange-500 bg-orange-500/20 text-orange-400"
                                : "border-white/20 bg-white/5 text-white/70 hover:bg-white/10"
                            }`}
                            title={ico.label}
                          >
                            <svg className="h-4 w-4" fill={ico.stroke === false ? "currentColor" : "none"} stroke={ico.stroke !== false ? "currentColor" : undefined} viewBox="0 0 24 24">
                              {"d" in ico && ico.d ? (
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={ico.d} />
                              ) : "circles" in ico && ico.circles ? (
                                ico.circles.map((c, i) => <circle key={i} cx={c.cx} cy={c.cy} r={c.r} />)
                              ) : null}
                            </svg>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  <div>
                    <span className="text-[10px] text-white/50">Logo style</span>
                    <select
                      value={logoStyle}
                      onChange={(e) => {
                        const v = e.target.value;
                        setLogoStyle(v);
                        updateNavProps("logoStyle", v);
                      }}
                      className="mt-0.5 w-full rounded-md border border-white/20 bg-white/10 px-2 py-1.5 text-xs text-white focus:border-orange-500 focus:outline-none"
                    >
                      {LOGO_STYLE_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value} className="bg-[#1a1a1a] text-white">
                          {o.label}
                        </option>
                      ))}
                    </select>
                    {logoStyle === "image" && navIndex >= 0 && (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            const nav = layoutForLanding?.sections[navIndex];
                            if (nav?.type !== "navbar") return;
                            const logoImage = (nav.props as { logoImage?: string }).logoImage ?? "";
                            ctx.openEditor({
                              path: `sections.${navIndex}.props.logoImage`,
                              value: logoImage,
                              type: "image",
                              label: "Logo image",
                              updateTarget: ctx.onUpdateHome ? "home" : undefined,
                            });
                          }}
                          className="mt-1.5 flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-white/30 bg-white/5 py-2.5 text-xs text-white/70 transition-colors hover:border-orange-500/50 hover:bg-white/10"
                        >
                          {(() => {
                            const nav = layoutForLanding?.sections[navIndex];
                            const img = nav?.type === "navbar" ? (nav.props as { logoImage?: string }).logoImage : undefined;
                            return img ? (
                              <>
                                <img
                                  src={img.startsWith("http") ? `/api/image-proxy?url=${encodeURIComponent(img)}` : img}
                                  alt="Logo"
                                  className="h-6 w-auto max-w-[60px] object-contain"
                                />
                                <span>Change logo image</span>
                              </>
                            ) : (
                              <>
                                <span className="text-base opacity-50">&#128247;</span>
                                <span>Add logo image (paste URL or search)</span>
                              </>
                            );
                          })()}
                        </button>
                        <div className="mt-1.5 grid grid-cols-2 gap-2">
                          <div>
                            <span className="text-[10px] text-white/50">Height (px)</span>
                            <input
                              type="number"
                              min={16}
                              max={120}
                              value={logoHeight}
                              onChange={(e) => {
                                const v = e.target.value === "" ? "" : Math.min(120, Math.max(16, parseInt(e.target.value, 10) || 32));
                                setLogoHeight(v);
                                updateNavProps("logoHeight", v === "" ? 32 : v);
                              }}
                              className="mt-0.5 w-full rounded-md border border-white/20 bg-white/10 px-2 py-1.5 text-xs text-white focus:border-orange-500 focus:outline-none"
                            />
                          </div>
                          <div>
                            <span className="text-[10px] text-white/50">Width (px)</span>
                            <input
                              type="number"
                              min={40}
                              max={300}
                              value={logoWidth}
                              onChange={(e) => {
                                const v = e.target.value === "" ? "" : Math.min(300, Math.max(40, parseInt(e.target.value, 10) || 140));
                                setLogoWidth(v);
                                updateNavProps("logoWidth", v === "" ? 140 : v);
                              }}
                              className="mt-0.5 w-full rounded-md border border-white/20 bg-white/10 px-2 py-1.5 text-xs text-white focus:border-orange-500 focus:outline-none"
                            />
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                  <label className="flex cursor-pointer items-center gap-2">
                    <input
                      type="checkbox"
                      checked={showNavBorder}
                      onChange={(e) => {
                        const v = e.target.checked;
                        setShowNavBorder(v);
                        updateNavProps("showBorder", v);
                      }}
                      className="rounded border-white/20 bg-white/10 text-orange-500 focus:ring-orange-500"
                    />
                    <span className="text-[10px] text-white/70">Line under header</span>
                  </label>
                  <label className="flex cursor-pointer items-center gap-2">
                    <input
                      type="checkbox"
                      checked={showLogoDivider}
                      onChange={(e) => {
                        const v = e.target.checked;
                        setShowLogoDivider(v);
                        updateNavProps("showLogoDivider", v);
                      }}
                      className="rounded border-white/20 bg-white/10 text-orange-500 focus:ring-orange-500"
                    />
                    <span className="text-[10px] text-white/70">Line between logo and links</span>
                  </label>
                </>
              )}
            </div>
          </div>
        )}
        <div>
          <p className="mb-1.5 text-xs font-medium uppercase tracking-wider text-white/70">Colors</p>
          <div className="space-y-2">
            <div className="flex items-center gap-1.5">
              <span className="w-14 shrink-0 text-[10px] text-white/50">Text</span>
              <div className="flex flex-wrap gap-1">
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => { setTextColor(c); applyTheme({ textColor: c }); }}
                    className={`h-6 w-6 rounded border-2 transition-all ${
                      textColor === c ? "border-orange-500 scale-110" : "border-white/20 hover:border-white/40"
                    }`}
                    style={{ backgroundColor: c }}
                    title={c}
                  />
                ))}
                <input
                  type="color"
                  value={textColor}
                  onChange={(e) => { setTextColor(e.target.value); applyTheme({ textColor: e.target.value }); }}
                  className="h-6 w-6 cursor-pointer rounded border border-white/20 bg-transparent"
                />
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-14 shrink-0 text-[10px] text-white/50">Bg</span>
              <div className="flex flex-wrap gap-1">
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => { setBackgroundColor(c); applyTheme({ backgroundColor: c }); }}
                    className={`h-6 w-6 rounded border-2 transition-all ${
                      backgroundColor === c ? "border-orange-500 scale-110" : "border-white/20 hover:border-white/40"
                    }`}
                    style={{ backgroundColor: c }}
                    title={c}
                  />
                ))}
                <input
                  type="color"
                  value={backgroundColor}
                  onChange={(e) => { setBackgroundColor(e.target.value); applyTheme({ backgroundColor: e.target.value }); }}
                  className="h-6 w-6 cursor-pointer rounded border border-white/20 bg-transparent"
                />
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-14 shrink-0 text-[10px] text-white/50">Accent</span>
              <div className="flex flex-wrap gap-1">
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => { setAccentColor(c); applyTheme({ accentColor: c }); }}
                    className={`h-6 w-6 rounded border-2 transition-all ${
                      accentColor === c ? "border-orange-500 scale-110" : "border-white/20 hover:border-white/40"
                    }`}
                    style={{ backgroundColor: c }}
                    title={c}
                  />
                ))}
                <input
                  type="color"
                  value={accentColor}
                  onChange={(e) => { setAccentColor(e.target.value); applyTheme({ accentColor: e.target.value }); }}
                  className="h-6 w-6 cursor-pointer rounded border border-white/20 bg-transparent"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
