"use client";

import { useEffect, useState, useCallback } from "react";
import { DynamicPage } from "@/components/DynamicPage";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import {
  WebsiteLayoutSchema,
  type WebsiteLayout,
} from "@/lib/schema/website-layout";

interface PreviewProject {
  pages: Array<{ name: string; layout: WebsiteLayout }>;
  activePageIndex: number;
}

export default function PreviewPage() {
  const [project, setProject] = useState<PreviewProject | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const projectsRaw = localStorage.getItem("mocha-projects");
      const activeIdRaw = localStorage.getItem("mocha-active-project");

      if (projectsRaw && activeIdRaw) {
        const projects = JSON.parse(projectsRaw) as Array<{
          id: string;
          pages: Array<{ name: string; layout: unknown }>;
          activePageId: string;
        }>;
        const active = projects.find((p) => p.id === activeIdRaw);

        if (active) {
          const validPages = active.pages
            .filter((p) => p.layout)
            .map((p) => {
              const result = WebsiteLayoutSchema.safeParse(p.layout);
              return result.success
                ? { name: p.name, layout: result.data }
                : null;
            })
            .filter(
              (p): p is { name: string; layout: WebsiteLayout } => p !== null,
            );

          if (validPages.length > 0) {
            const activePageName = active.pages.find(
              (p) =>
                "id" in p &&
                (p as unknown as { id: string }).id === active.activePageId,
            )?.name;
            const activeIdx = activePageName
              ? validPages.findIndex((p) => p.name === activePageName)
              : 0;

            setProject({
              pages: validPages,
              activePageIndex: Math.max(0, activeIdx),
            });
            return;
          }
        }
      }

      const singleRaw = sessionStorage.getItem("mocha-preview");
      if (singleRaw) {
        const parsed = JSON.parse(singleRaw);
        const result = WebsiteLayoutSchema.safeParse(parsed);
        if (result.success) {
          setProject({
            pages: [{ name: "Home", layout: result.data }],
            activePageIndex: 0,
          });
          return;
        }
      }

      setError("No preview data found. Generate a website first.");
    } catch {
      setError("Failed to load preview.");
    }
  }, []);

  const handleNavigate = useCallback(
    (href: string) => {
      if (!project) return;
      const raw = href.replace("#", "").toLowerCase();
      const normalize = (s: string) =>
        s.toLowerCase().replace(/[\s\-_]+/g, "");
      const norm = normalize(raw);

      let idx = project.pages.findIndex((p) => normalize(p.name) === norm);
      if (idx === -1) {
        idx = project.pages.findIndex((p) => {
          const pNorm = normalize(p.name);
          if (pNorm.startsWith(norm) || norm.startsWith(pNorm)) return true;
          if (pNorm.includes(norm) || norm.includes(pNorm)) return true;
          const rawWords = raw.replace(/[-_]/g, " ").split(/\s+/);
          const pWords = p.name.toLowerCase().split(/\s+/);
          if (rawWords[0] && pWords[0] && rawWords[0] === pWords[0]) return true;
          return false;
        });
      }

      if (idx === -1 && (raw === "home" || raw === "")) {
        idx = 0;
      }

      if (idx !== -1) {
        setProject((prev) =>
          prev ? { ...prev, activePageIndex: idx } : prev,
        );
      }
    },
    [project],
  );

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0a0a] text-white">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Preview Unavailable</h1>
          <p className="mt-2 text-sm text-white/50">{error}</p>
          <a
            href="/"
            className="mt-6 inline-block rounded-full bg-orange-500 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-orange-600"
          >
            Back to Builder
          </a>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0a0a] text-white">
        <div className="flex items-center gap-2 text-sm text-white/50">
          <span className="inline-flex gap-1">
            <span className="h-2 w-2 animate-bounce rounded-full bg-orange-500 [animation-delay:-0.3s]" />
            <span className="h-2 w-2 animate-bounce rounded-full bg-orange-500 [animation-delay:-0.15s]" />
            <span className="h-2 w-2 animate-bounce rounded-full bg-orange-500" />
          </span>
          Loading preview...
        </div>
      </div>
    );
  }

  const currentPage = project.pages[project.activePageIndex];
  const homeLayout = project.pages[0]?.layout;
  const isSubPage = project.activePageIndex > 0 && homeLayout;

  const viewLayout: WebsiteLayout = (() => {
    if (!isSubPage) return currentPage.layout;

    const homeNavbar = homeLayout.sections.find((s) => s.type === "navbar");
    const homeFooter = homeLayout.sections.find((s) => s.type === "footer");
    const contentSections = currentPage.layout.sections.filter(
      (s) => s.type !== "navbar" && s.type !== "footer" && s.type !== "banner",
    );

    return {
      ...currentPage.layout,
      theme: homeLayout.theme,
      sections: [
        ...(homeNavbar ? [homeNavbar] : []),
        ...contentSections,
        ...(homeFooter ? [homeFooter] : []),
      ],
    };
  })();

  return (
    <>
      {/* Close button */}
      <div className="fixed right-4 top-4 z-[9999] flex items-center gap-2">
        <a
          href="/"
          className="flex items-center gap-1.5 rounded-full bg-black/80 px-4 py-1.5 text-xs font-semibold text-white shadow-lg backdrop-blur transition-colors hover:bg-black"
        >
          <svg
            className="h-3.5 w-3.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
          Close
        </a>
      </div>
      <ErrorBoundary>
        <DynamicPage
          layout={viewLayout}
          onNavigate={handleNavigate}
        />
      </ErrorBoundary>
    </>
  );
}
