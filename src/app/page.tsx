"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { DynamicPage } from "@/components/DynamicPage";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { NavStructureEditor } from "@/components/NavStructureEditor";
import { PreviewEditProvider } from "@/components/PreviewEditContext";
import { ResizeHandle } from "@/components/ResizeHandle";
import { ThemeEditorPanel } from "@/components/ThemeEditorPanel";
import type { WebsiteLayout } from "@/lib/schema/website-layout";
import type { Project } from "@/types/project";
import {
  createProject,
  loadProjects,
  saveProjects,
  loadActiveProjectId,
  saveActiveProjectId,
  addMessage,
  addPageToProject,
  updatePageLayout,
  updatePageLayoutWithHistory,
  pushLayoutToHistory,
  revertLayout,
  removeLastLayoutMessages,
  hasLayoutHistory,
  deletePageFromProject,
  renamePageInProject,
} from "@/lib/store/project-store";

export default function Home() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [previewScale, setPreviewScale] = useState<"desktop" | "mobile">("desktop");
  const [sidebarTab, setSidebarTab] = useState<"chat" | "projects">("chat");
  const [newPageName, setNewPageName] = useState("");
  const [showNewPage, setShowNewPage] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [urlInput, setUrlInput] = useState("");
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [chatCollapsed, setChatCollapsed] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(360);
  const [themePanelWidth, setThemePanelWidth] = useState(260);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const activeProject = projects.find((p) => p.id === activeProjectId) ?? null;
  const activePage = activeProject?.pages.find(
    (p) => p.id === activeProject.activePageId,
  ) ?? null;

  const homePage = activeProject?.pages[0] ?? null;
  const isSubPage = activePage && homePage && activePage.id !== homePage.id;

  const { viewLayout, sectionEditIndices } = (() => {
    if (!activePage?.layout) return { viewLayout: null as WebsiteLayout | null, sectionEditIndices: [] as (number | null)[] };
    if (!isSubPage || !homePage?.layout) {
      const indices = activePage.layout.sections.map((_, i) => i);
      return { viewLayout: activePage.layout, sectionEditIndices: indices };
    }

    const homeNavbar = homePage.layout.sections.find((s) => s.type === "navbar");
    const homeFooter = homePage.layout.sections.find((s) => s.type === "footer");
    const contentSections = activePage.layout.sections.filter(
      (s) => s.type !== "navbar" && s.type !== "footer" && s.type !== "banner",
    );
    const contentOriginalIndices: number[] = [];
    let idx = 0;
    for (let i = 0; i < activePage.layout.sections.length; i++) {
      const s = activePage.layout.sections[i];
      if (s.type !== "navbar" && s.type !== "footer" && s.type !== "banner") {
        contentOriginalIndices.push(i);
      }
    }

    const sections = [
      ...(homeNavbar ? [homeNavbar] : []),
      ...contentSections,
      ...(homeFooter ? [homeFooter] : []),
    ];
    const sectionEditIndices: (number | null)[] = sections.map((_, i) => {
      if (homeNavbar && i === 0) return null;
      if (homeFooter && i === sections.length - 1) return null;
      const contentIdx = homeNavbar ? i - 1 : i;
      return contentOriginalIndices[contentIdx] ?? null;
    });

    return {
      viewLayout: {
        ...activePage.layout,
        theme: homePage.layout.theme,
        sections,
      },
      sectionEditIndices,
    };
  })();

  useEffect(() => {
    const sw = localStorage.getItem("mocha-sidebar-width");
    const tp = localStorage.getItem("mocha-theme-panel-width");
    if (sw) setSidebarWidth(Math.min(600, Math.max(280, parseInt(sw, 10) || 360)));
    if (tp) setThemePanelWidth(Math.min(420, Math.max(200, parseInt(tp, 10) || 260)));
  }, []);

  useEffect(() => {
    const saved = loadProjects();
    const savedActiveId = loadActiveProjectId();
    if (saved.length > 0) {
      setProjects(saved);
      setActiveProjectId(
        savedActiveId && saved.some((p) => p.id === savedActiveId)
          ? savedActiveId
          : saved[0].id,
      );
    } else {
      const first = createProject("My First Project");
      setProjects([first]);
      setActiveProjectId(first.id);
      saveProjects([first]);
      saveActiveProjectId(first.id);
    }
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeProject?.messages]);

  const persist = useCallback(
    (updated: Project[]) => {
      setProjects(updated);
      saveProjects(updated);
    },
    [],
  );

  const updateProject = useCallback(
    (projectId: string, updater: (p: Project) => Project) => {
      setProjects((prev) => {
        const updated = prev.map((p) =>
          p.id === projectId ? updater(p) : p,
        );
        saveProjects(updated);
        return updated;
      });
    },
    [],
  );

  const handleCancelGeneration = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, []);

  const handleNewProject = useCallback(() => {
    const proj = createProject(`Project ${projects.length + 1}`);
    const updated = [...projects, proj];
    persist(updated);
    setActiveProjectId(proj.id);
    saveActiveProjectId(proj.id);
    setSidebarTab("chat");
  }, [projects, persist]);

  const handleSwitchProject = useCallback((id: string) => {
    setActiveProjectId(id);
    saveActiveProjectId(id);
    setSidebarTab("chat");
  }, []);

  const handleDeleteProject = useCallback(
    (id: string) => {
      const filtered = projects.filter((p) => p.id !== id);
      if (filtered.length === 0) {
        const fresh = createProject("My First Project");
        persist([fresh]);
        setActiveProjectId(fresh.id);
        saveActiveProjectId(fresh.id);
      } else {
        persist(filtered);
        if (activeProjectId === id) {
          setActiveProjectId(filtered[0].id);
          saveActiveProjectId(filtered[0].id);
        }
      }
    },
    [projects, activeProjectId, persist],
  );

  const generatePageContent = useCallback(
    async (pageId: string, pageName: string) => {
      if (!activeProject || isGenerating) return;

      setIsGenerating(true);
      abortControllerRef.current = new AbortController();

      updateProject(activeProject.id, (p) =>
        addMessage(p, "assistant", `Creating "${pageName}" page...`),
      );

      try {
        const currentProjects = loadProjects();
        const freshProject = currentProjects.find(
          (p) => p.id === activeProject.id,
        );
        if (!freshProject) {
          setIsGenerating(false);
          return;
        }

        const homePageData = freshProject.pages[0];
        const homeLayout = homePageData?.layout;
        const allPageNames = freshProject.pages.map((p) => p.name);
        const themeMode = homeLayout?.theme.mode ?? "dark";
        const primaryColor = homeLayout?.theme.primaryColor ?? "#0a0a0a";
        const accentColor = homeLayout?.theme.accentColor ?? "#f97316";

        const productSection = homeLayout?.sections.find(
          (s) => s.type === "product-grid",
        );
        const samplePrice = productSection
          ? ((
              productSection.props as unknown as {
                products?: Array<{ price?: string }>;
              }
            ).products?.[0]?.price ?? "")
          : "";
        const currencyHint = samplePrice.includes("₹")
          ? "Use Indian Rupees (₹) for all prices."
          : samplePrice.includes("€")
            ? "Use Euros (€) for all prices."
            : samplePrice.includes("£")
              ? "Use British Pounds (£) for all prices."
              : "";

        const prompt = `Generate ONLY the content sections for a "${pageName}" sub-page of the "${freshProject.name}" website. 

CRITICAL: Do NOT include a navbar or footer section — those are shared from the home page automatically. Do NOT include a hero carousel either.

Use this EXACT theme: { "mode": "${themeMode}", "primaryColor": "${primaryColor}", "accentColor": "${accentColor}" }
Use this title: "${homeLayout?.title ?? freshProject.name}"

Generate content relevant to "${pageName}": use product-grid with 6-8 real ${pageName} products. Each product must have a real name, imageQuery for Google Images, and realistic price. ${currencyHint}

Return sections array with ONLY content blocks (product-grid, features, stats, faq, testimonials, etc). No navbar, no footer.`;

        const response = await fetch("/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt,
            pageName,
            projectPages: allPageNames,
            isHomePage: false,
          }),
          signal: abortControllerRef.current.signal,
        });

        const data: unknown = await response.json();
        if (!response.ok) {
          throw new Error(
            (data as { error?: string }).error ??
              `Request failed (${response.status})`,
          );
        }

        const layout = (data as { layout: WebsiteLayout }).layout;

        updateProject(activeProject.id, (p) => {
          const currentLayout = p.pages.find((pg) => pg.id === pageId)?.layout ?? null;
          let updated = pushLayoutToHistory(p, pageId, currentLayout);
          updated = updatePageLayout(updated, pageId, layout);
          updated = { ...updated, activePageId: pageId };
          updated = addMessage(
            updated,
            "assistant",
            `Built your "${pageName}" page — ${layout.theme.mode} theme with ${layout.sections.length} sections.`,
            pageId,
          );
          return updated;
        });
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
          updateProject(activeProject.id, (p) =>
            addMessage(p, "assistant", "Generation cancelled.", pageId),
          );
        } else {
          updateProject(activeProject.id, (p) =>
            addMessage(
              p,
              "assistant",
              `Error creating "${pageName}" page: ${error instanceof Error ? error.message : "Unknown error"}. Try describing what you want in the chat.`,
            ),
          );
        }
      } finally {
        setIsGenerating(false);
        abortControllerRef.current = null;
      }
    },
    [activeProject, isGenerating, updateProject],
  );

  const handleSwitchPage = useCallback(
    (pageId: string) => {
      if (!activeProject) return;
      updateProject(activeProject.id, (p) => ({
        ...p,
        activePageId: pageId,
      }));

      const targetPage = activeProject.pages.find((p) => p.id === pageId);
      const isHome = activeProject.pages[0]?.id === pageId;
      if (targetPage && !targetPage.layout && !isHome && !isGenerating) {
        generatePageContent(pageId, targetPage.name);
      }
    },
    [activeProject, updateProject, isGenerating, generatePageContent],
  );

  const handleAddPage = useCallback(() => {
    if (!activeProject || !newPageName.trim()) return;
    updateProject(activeProject.id, (p) =>
      addPageToProject(p, newPageName.trim()),
    );
    setNewPageName("");
    setShowNewPage(false);
  }, [activeProject, newPageName, updateProject]);

  const handleDeletePage = useCallback(
    (pageId: string) => {
      if (!activeProject) return;
      updateProject(activeProject.id, (p) =>
        deletePageFromProject(p, pageId),
      );
    },
    [activeProject, updateProject],
  );

  const detectTargetPage = useCallback(
    (text: string): { id: string; name: string } | null => {
      if (!activeProject) return null;
      const lower = text.toLowerCase();
      const normalize = (s: string) => s.toLowerCase().replace(/[\s\-_]+/g, "");

      if (
        lower.includes("header") ||
        lower.includes("navbar") ||
        lower.includes("nav bar") ||
        lower.includes("nav-bar") ||
        lower.includes("menu") ||
        lower.includes("footer")
      ) {
        const homePage = activeProject.pages[0];
        if (homePage) {
          return { id: homePage.id, name: homePage.name };
        }
      }

      for (const page of activeProject.pages) {
        const pLower = page.name.toLowerCase();
        const pNorm = normalize(page.name);
        if (
          lower.includes(`in ${pLower}`) ||
          lower.includes(`on ${pLower}`) ||
          lower.includes(`to ${pLower}`) ||
          lower.includes(`${pLower} page`) ||
          lower.includes(`in ${pNorm}`) ||
          lower.includes(`on ${pNorm}`) ||
          lower.includes(`to ${pNorm}`) ||
          lower.includes(`${pNorm} page`)
        ) {
          return { id: page.id, name: page.name };
        }
      }
      return null;
    },
    [activeProject],
  );

  const detectNewPage = useCallback(
    (text: string): string | null => {
      const lower = text.toLowerCase();
      const skipKeywords = [
        "website", "site", "web app", "webapp", "project",
        "frontend", "application", "landing",
      ];
      if (skipKeywords.some((kw) => lower.includes(`create a ${kw}`) || lower.includes(`build a ${kw}`) || lower.includes(`make a ${kw}`))) {
        return null;
      }

      const modifyIndicators = [
        /add\s+(?:a\s+|the\s+)?(?:section|subsection|content|part)\s/i,
        /add\s+(?:in|to|on)\s/i,
        /update\s/i,
        /change\s/i,
        /modify\s/i,
        /edit\s/i,
        /remove\s/i,
        /delete\s/i,
      ];
      if (modifyIndicators.some((p) => p.test(lower))) {
        return null;
      }

      const patterns = [
        /create\s+(?:a\s+)?(\w[\w\s]*?)\s+page\b(?!s)/i,
        /build\s+(?:a\s+)?(\w[\w\s]*?)\s+page\b(?!s)/i,
        /add\s+(?:a\s+)?(\w[\w\s]*?)\s+page\b(?!s)/i,
        /make\s+(?:a\s+)?(\w[\w\s]*?)\s+page\b(?!s)/i,
        /let'?s?\s+create\s+(?:a\s+)?(\w[\w\s]*?)\s+page\b(?!s)/i,
      ];
      for (const pattern of patterns) {
        const match = text.match(pattern);
        if (match?.[1]) {
          const name = match[1].trim().replace(/\b\w/g, (c) => c.toUpperCase());
          if (name.split(/\s+/).length > 4) continue;
          if (!activeProject?.pages.some((p) => p.name.toLowerCase() === name.toLowerCase())) {
            return name;
          }
        }
      }
      return null;
    },
    [activeProject],
  );

  const findMatchingPage = useCallback(
    (raw: string, project: Project) => {
      const normalize = (s: string) =>
        s.toLowerCase().replace(/[\s\-_]+/g, "");
      const norm = normalize(raw);

      const exact = project.pages.find((p) => normalize(p.name) === norm);
      if (exact) return exact;

      return project.pages.find((p) => {
        const pNorm = normalize(p.name);
        if (pNorm.startsWith(norm) || norm.startsWith(pNorm)) return true;
        if (pNorm.includes(norm) || norm.includes(pNorm)) return true;
        const rawWords = raw.replace(/[-_]/g, " ").split(/\s+/);
        const pWords = p.name.toLowerCase().split(/\s+/);
        if (rawWords[0] && pWords[0] && rawWords[0] === pWords[0]) return true;
        return false;
      });
    },
    [],
  );

  const autoGeneratePage = useCallback(
    async (pageName: string) => {
      if (!activeProject || isGenerating) return;

      const displayName = pageName
        .replace(/[-_]/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase());

      const updatedProject = addPageToProject(activeProject, displayName);
      const newPage = updatedProject.pages.find((p) => p.name === displayName);
      if (!newPage) return;

      updateProject(activeProject.id, () => updatedProject);
      generatePageContent(newPage.id, displayName);
    },
    [activeProject, isGenerating, updateProject, generatePageContent],
  );

  const handleNavigate = useCallback(
    (href: string) => {
      if (!activeProject) return;
      const raw = href.replace("#", "").toLowerCase();

      if (raw === "home" || raw === "") {
        const homePage = activeProject.pages[0];
        if (homePage) handleSwitchPage(homePage.id);
        return;
      }

      const targetPage = findMatchingPage(raw, activeProject);

      if (targetPage) {
        handleSwitchPage(targetPage.id);
      } else {
        autoGeneratePage(raw);
      }
    },
    [activeProject, handleSwitchPage, findMatchingPage, autoGeneratePage],
  );

  const handleSubmit = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed || isGenerating || !activeProject) return;

    setInput("");
    const imgToSend = selectedImage;
    setSelectedImage(null);

    updateProject(activeProject.id, (p) => addMessage(p, "user", trimmed, undefined, imgToSend || undefined));

    if (trimmed.length < 10) {
      updateProject(activeProject.id, (p) =>
        addMessage(
          p,
          "assistant",
          'Please describe in more detail — e.g. "A modern e-commerce site for a sneaker brand with product listings and dark theme."',
        ),
      );
      return;
    }

    setIsGenerating(true);
    abortControllerRef.current = new AbortController();

    try {
      const mentionedPage = detectTargetPage(trimmed);
      let targetPageId = activeProject.activePageId;
      let targetPageName = activePage?.name ?? "Home";

      if (mentionedPage) {
        targetPageId = mentionedPage.id;
        targetPageName = mentionedPage.name;
        handleSwitchPage(mentionedPage.id);
      }

      const newPageName = mentionedPage ? null : detectNewPage(trimmed);

      let proj = activeProject;
      if (newPageName) {
        const updatedProject = addPageToProject(activeProject, newPageName);
        const newPage = updatedProject.pages.find((p) => p.name === newPageName);
        if (newPage) {
          targetPageId = newPage.id;
          targetPageName = newPageName;
        }
        updateProject(activeProject.id, () => updatedProject);
        proj = updatedProject;
      } else {
        const currentProjects = loadProjects();
        proj = currentProjects.find((p) => p.id === activeProject.id) ?? activeProject;
      }
      const allPageNames = proj.pages.map((p) => p.name);
      const existingLayout =
        proj.pages.find((p) => p.id === targetPageId)?.layout ?? undefined;
      const targetIsHome = proj.pages[0]?.id === targetPageId;

      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: trimmed,
          existingLayout: existingLayout || undefined,
          pageName: targetPageName,
          projectPages: allPageNames,
          isHomePage: targetIsHome,
          activePageName: activePage?.name,
          image: imgToSend || undefined,
        }),
      });

      const data: unknown = await response.json();

      if (!response.ok) {
        const errorData = data as { error?: string };
        throw new Error(
          errorData.error ?? `Request failed (${response.status})`,
        );
      }

      const successData = data as { layout: WebsiteLayout };
      const layout = successData.layout;

      updateProject(activeProject.id, (p) => {
        let updated = pushLayoutToHistory(p, targetPageId, existingLayout ?? null);
        updated = updatePageLayout(updated, targetPageId, layout);
        updated = { ...updated, activePageId: targetPageId };
        updated = addMessage(
          updated,
          "assistant",
          `${existingLayout ? "Updated" : "Built"} your "${targetPageName}" page — ${layout.theme.mode} theme with ${layout.sections.length} sections.`,
          targetPageId,
        );
        if (
          !updated.name ||
          updated.name.startsWith("Project ") ||
          updated.name === "Untitled Project" ||
          updated.name === "My First Project"
        ) {
          updated = { ...updated, name: layout.title };
        }
        return updated;
      });
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        updateProject(activeProject.id, (p) =>
          addMessage(p, "assistant", "Generation cancelled."),
        );
      } else {
        updateProject(activeProject.id, (p) =>
          addMessage(
            p,
            "assistant",
            `Error: ${error instanceof Error ? error.message : "Unknown error"}. Please try again.`,
          ),
        );
      }
    } finally {
      setIsGenerating(false);
      abortControllerRef.current = null;
    }
  }, [input, isGenerating, activeProject, activePage, updateProject, detectNewPage, selectedImage]);

  const handleGenerateFromUrl = useCallback(async () => {
    const url = urlInput.trim();
    if (!url || isGenerating || !activeProject) return;
    try {
      const validUrl = url.startsWith("http") ? url : `https://${url}`;
      new URL(validUrl);
      setUrlInput("");
      setShowUrlInput(false);
      setIsGenerating(true);
      abortControllerRef.current = new AbortController();
      updateProject(activeProject.id, (p) =>
        addMessage(p, "user", `Generate a website from ${validUrl}`),
      );

      const res = await fetch("/api/generate-from-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: validUrl, prompt: "Replicate this website" }),
        signal: abortControllerRef.current.signal,
      });
      const data = (await res.json()) as {
        layout?: WebsiteLayout;
        subPages?: Array<{ name: string; href: string; layout: WebsiteLayout }>;
        error?: string;
        confidence?: number;
      };

      if (!res.ok) throw new Error(data.error ?? "Failed");

      const layout = data.layout!;
      const subPages = data.subPages ?? [];
      const homeId = activeProject.pages[0]?.id;
      if (homeId) {
        const navSection = layout.sections.find((s) => s.type === "navbar");
        const navLinks = navSection?.type === "navbar" ? navSection.props.links : [];
        const seen = new Set<string>();
        const pageNames: string[] = [];
        for (const l of navLinks) {
          if (l.href && l.href !== "#" && l.href !== "#home") {
            const name = l.label.trim() || l.href.replace("#", "").replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
            if (name && !seen.has(name.toLowerCase())) {
              seen.add(name.toLowerCase());
              pageNames.push(name);
            }
          }
          if (l.children) {
            for (const c of l.children) {
              if (c.href && c.href !== "#" && c.href !== "#home") {
                const name = c.label.trim() || c.href.replace("#", "").replace(/[-_]/g, " ").replace(/\b\w/g, (ch) => ch.toUpperCase());
                if (name && !seen.has(name.toLowerCase())) {
                  seen.add(name.toLowerCase());
                  pageNames.push(name);
                }
              }
            }
          }
        }

        updateProject(activeProject.id, (p) => {
          let updated = p;
          for (const name of pageNames) {
            if (!updated.pages.some((pg) => pg.name.toLowerCase() === name.toLowerCase())) {
              updated = addPageToProject(updated, name);
            }
          }
          const currentHomeLayout = updated.pages.find((pg) => pg.id === homeId)?.layout ?? null;
          updated = pushLayoutToHistory(updated, homeId, currentHomeLayout);
          updated = updatePageLayout(updated, homeId, layout);
          for (const sp of subPages) {
            const existing = updated.pages.find((pg) => pg.name.toLowerCase() === sp.name.toLowerCase());
            if (existing) {
              const prevLayout = existing.layout ?? null;
              updated = pushLayoutToHistory(updated, existing.id, prevLayout);
              updated = updatePageLayout(updated, existing.id, sp.layout);
            } else {
              updated = addPageToProject(updated, sp.name);
              const newPage = updated.pages.find((pg) => pg.name === sp.name);
              if (newPage) updated = updatePageLayout(updated, newPage.id, sp.layout);
            }
          }
          updated = { ...updated, activePageId: homeId };
          const totalPages = updated.pages.length;
          updated = addMessage(
            updated,
            "assistant",
            `Built from ${validUrl} — ${layout.sections.length} sections, ${totalPages} pages${subPages.length ? ` (${subPages.length} sub-pages scraped)` : ""} (confidence: ${Math.round((data.confidence ?? 0) * 100)}%)`,
            homeId,
          );
          if (!updated.name || updated.name.startsWith("Project ")) {
            updated = { ...updated, name: layout.title };
          }
          return updated;
        });
      }
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        updateProject(activeProject.id, (p) =>
          addMessage(p, "assistant", "Generation cancelled."),
        );
      } else {
        updateProject(activeProject.id, (p) =>
          addMessage(p, "assistant", `Error: ${err instanceof Error ? err.message : "Failed to generate from URL"}. Make sure the URL is accessible.`),
        );
      }
    } finally {
      setIsGenerating(false);
      abortControllerRef.current = null;
    }
  }, [urlInput, isGenerating, activeProject, updateProject]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Please upload an image file.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert("Image must be less than 5MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setSelectedImage(event.target?.result as string);
    };
    reader.readAsDataURL(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = Array.from(e.clipboardData.items);
    for (const item of items) {
      if (item.type.startsWith("image/")) {
        const file = item.getAsFile();
        if (!file) continue;

        if (file.size > 5 * 1024 * 1024) {
          alert("Image must be less than 5MB.");
          return;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
          setSelectedImage(event.target?.result as string);
        };
        reader.readAsDataURL(file);

        // Prevent default paste so the image string/data isn't dumped into the textarea
        e.preventDefault();
        break;
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleRevert = useCallback(() => {
    if (!activeProject || !activePage?.id) return;
    const reverted = revertLayout(activeProject, activePage.id);
    if (reverted) {
      const withoutMessages = removeLastLayoutMessages(reverted, activePage.id);
      updateProject(activeProject.id, () => withoutMessages);
    }
  }, [activeProject, activePage?.id, updateProject]);

  const canRevert = activeProject && activePage && hasLayoutHistory(activeProject, activePage.id);

  return (
    <div className="flex h-screen flex-col bg-[#0a0a0a] text-white">
      {/* Top bar */}
      <header className="flex h-12 shrink-0 items-center justify-between border-b border-white/10 px-4">
        <div className="flex items-center gap-3">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-orange-500 text-xs font-bold text-white">
            M
          </div>
          <span className="text-sm font-semibold tracking-wide">Luma</span>
          {activeProject && (
            <>
              <span className="text-white/20">/</span>
              <span className="text-xs text-white/50">
                {activeProject.name}
              </span>
            </>
          )}
        </div>
        <div className="flex items-center gap-3">
          {viewLayout && activePage && editMode && (
            <button
              onClick={() => setChatCollapsed((c) => !c)}
              className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-white/50 transition-colors hover:bg-white/5 hover:text-white/70"
              title={chatCollapsed ? "Show chat" : "Close chat"}
            >
              {chatCollapsed ? (
                <>
                  <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  Show chat
                </>
              ) : (
                <>
                  <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Close chat
                </>
              )}
            </button>
          )}
          {viewLayout && activePage && (
            <button
              onClick={() => setEditMode((e) => !e)}
              className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors ${
                editMode ? "bg-orange-500 text-white" : "text-white/50 hover:bg-white/5 hover:text-white/70"
              }`}
              title="Edit text, prices, font & color directly in preview"
            >
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
              {editMode ? "Editing" : "Edit"}
            </button>
          )}
          <div className="flex items-center gap-1 rounded-lg border border-white/10 p-0.5">
            <button
              onClick={() => setPreviewScale("desktop")}
              className={`rounded-md px-2 py-1 text-xs transition-colors ${previewScale === "desktop" ? "bg-white/10 text-white" : "text-white/40 hover:text-white/60"}`}
            >
              Desktop
            </button>
            <button
              onClick={() => setPreviewScale("mobile")}
              className={`rounded-md px-2 py-1 text-xs transition-colors ${previewScale === "mobile" ? "bg-white/10 text-white" : "text-white/40 hover:text-white/60"}`}
            >
              Mobile
            </button>
          </div>
          {canRevert && (
            <button
              onClick={handleRevert}
              className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-white/50 transition-colors hover:bg-white/5 hover:text-white/70"
              title="Revert to previous version"
            >
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
              </svg>
              Revert
            </button>
          )}
          {activePage?.layout && (
            <button
              onClick={() => window.open("/preview", "_blank")}
              className="flex items-center gap-1.5 rounded-lg bg-orange-500 px-3 py-1.5 text-xs font-semibold text-white transition-all hover:bg-orange-600"
            >
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              Preview
            </button>
          )}
        </div>
      </header>

      {/* Main area */}
      <div className="flex min-h-0 flex-1">
        {/* Sidebar - hidden when chat collapsed in edit mode */}
        {!(editMode && chatCollapsed) && (
        <>
        <aside
          className="flex shrink-0 flex-col border-r border-white/10"
          style={{ width: sidebarWidth }}
        >
          {/* Sidebar tabs */}
          <div className="flex border-b border-white/10">
            <button
              onClick={() => setSidebarTab("chat")}
              className={`flex-1 py-2.5 text-xs font-medium transition-colors ${sidebarTab === "chat" ? "border-b-2 border-orange-500 text-white" : "text-white/40 hover:text-white/60"}`}
            >
              Chat
            </button>
            <button
              onClick={() => setSidebarTab("projects")}
              className={`flex-1 py-2.5 text-xs font-medium transition-colors ${sidebarTab === "projects" ? "border-b-2 border-orange-500 text-white" : "text-white/40 hover:text-white/60"}`}
            >
              Projects ({projects.length})
            </button>
          </div>

          {sidebarTab === "projects" ? (
            <div className="flex-1 overflow-y-auto p-3">
              <button
                onClick={handleNewProject}
                className="mb-3 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-white/20 py-3 text-xs font-medium text-white/60 transition-colors hover:border-orange-500/40 hover:text-orange-400"
              >
                <span className="text-lg leading-none">+</span>
                New Project
              </button>
              <div className="space-y-1.5">
                {projects.map((proj) => (
                  <button
                    key={proj.id}
                    onClick={() => handleSwitchProject(proj.id)}
                    className={`group flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left transition-colors ${proj.id === activeProjectId ? "bg-white/10 text-white" : "text-white/50 hover:bg-white/5 hover:text-white/70"}`}
                  >
                    <div className="flex-1">
                      <p className="text-sm font-medium">{proj.name}</p>
                      <p className="text-[10px] opacity-40">
                        {proj.pages.length} page{proj.pages.length !== 1 ? "s" : ""} &middot;{" "}
                        {new Date(proj.updatedAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteProject(proj.id);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.stopPropagation();
                          handleDeleteProject(proj.id);
                        }
                      }}
                      className="ml-2 rounded p-1 text-white/20 opacity-0 transition-all hover:text-red-400 group-hover:opacity-100"
                    >
                      <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              {/* Chat messages */}
              <div className="flex-1 overflow-y-auto px-4 py-4">
                {(!activeProject || activeProject.messages.length === 0) && (
                  <div className="flex h-full flex-col items-center justify-center text-center">
                    <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-500/10">
                      <span className="text-2xl">&#9889;</span>
                    </div>
                    <h2 className="text-lg font-semibold">
                      What do you want to build?
                    </h2>
                    <p className="mt-2 max-w-[260px] text-sm text-white/40">
                      Describe your website and I&apos;ll generate it. You can then modify it by chatting.
                    </p>
                    <div className="mt-6 space-y-2">
                      {[
                        "A Samsung smartphone store with dark theme",
                        "SaaS landing page for project management",
                        "Portfolio for a creative agency",
                      ].map((suggestion) => (
                        <button
                          key={suggestion}
                          onClick={() => {
                            setInput(suggestion);
                            inputRef.current?.focus();
                          }}
                          className="block w-full rounded-xl border border-white/10 px-4 py-2.5 text-left text-xs text-white/60 transition-colors hover:border-orange-500/30 hover:bg-orange-500/5 hover:text-white/80"
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {activeProject?.messages.map((msg) => (
                  <div key={msg.id} className="mb-4">
                    <div className="mb-1 flex items-center gap-2">
                      {msg.role === "user" ? (
                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-white/10 text-xs font-semibold">
                          U
                        </div>
                      ) : (
                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-orange-500 text-xs font-bold">
                          M
                        </div>
                      )}
                      <span className="text-xs text-white/30">
                        {new Date(msg.timestamp).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                      {msg.role === "assistant" &&
                        msg.layoutPageId &&
                        activeProject &&
                        hasLayoutHistory(activeProject, msg.layoutPageId) &&
                        activePage?.id === msg.layoutPageId && (
                          <button
                            onClick={handleRevert}
                            className="ml-auto flex items-center gap-1 rounded px-2 py-0.5 text-xs text-white/50 transition-colors hover:bg-white/10 hover:text-orange-400"
                            title="Revert this change"
                          >
                            <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                            </svg>
                            Revert
                          </button>
                        )}
                    </div>
                    <div className="ml-8">
                      {msg.imageUrl && (
                        <div className="mb-2">
                          <img
                            src={msg.imageUrl}
                            alt="Reference"
                            className="max-h-48 max-w-full rounded-lg border border-white/10 object-contain"
                          />
                        </div>
                      )}
                      <p className="text-sm leading-relaxed text-white/80">
                        {msg.content}
                      </p>
                    </div>
                  </div>
                ))}
                {isGenerating && (
                  <div className="mb-4">
                    <div className="mb-1 flex items-center gap-2">
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-orange-500 text-xs font-bold">
                        M
                      </div>
                    </div>
                    <div className="ml-8 flex flex-wrap items-center gap-2 text-sm text-white/50">
                      <LoadingDots />
                      <span>
                        {activePage?.layout
                          ? "Updating your design..."
                          : "Building your website..."}
                      </span>
                      <button
                        onClick={handleCancelGeneration}
                        className="ml-2 flex items-center gap-1.5 rounded-lg border border-white/20 px-2.5 py-1 text-xs font-medium text-white/70 transition-colors hover:border-red-500/50 hover:bg-red-500/10 hover:text-red-400"
                        title="Cancel generation"
                      >
                        <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        Pause
                      </button>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Pages & Navigation (drag & drop) */}
              {activeProject && homePage?.layout && (
                <NavStructureEditor
                  homePage={homePage}
                  pages={activeProject.pages}
                  onUpdateNav={(links) => {
                    if (!homePage?.layout || !activeProject) return;
                    const navIdx = homePage.layout.sections.findIndex((s) => s.type === "navbar");
                    if (navIdx < 0) return;
                    const updated = {
                      ...homePage.layout,
                      sections: homePage.layout.sections.map((s, i) =>
                        i === navIdx && s.type === "navbar"
                          ? { ...s, props: { ...s.props, links } }
                          : s,
                      ),
                    };
                    updateProject(activeProject.id, (p) =>
                      updatePageLayoutWithHistory(p, homePage!.id, updated),
                    );
                  }}
                  onAddPage={(name) => {
                    if (!activeProject || !homePage?.layout) return;
                    const layout = homePage.layout;
                    updateProject(activeProject.id, (p) => {
                      const withPage = addPageToProject(p, name);
                      const newPage = withPage.pages.find((pg) => pg.name === name);
                      if (!newPage) return withPage;
                      const navIdx = layout.sections.findIndex((s) => s.type === "navbar");
                      if (navIdx < 0) return withPage;
                      const nav = layout.sections[navIdx];
                      const links = nav?.type === "navbar" ? nav.props.links ?? [] : [];
                      const slug = name.toLowerCase().replace(/[\s\-_]+/g, "");
                      const newLinks = [...links, { label: name, href: `#${slug}` }];
                      const updated = {
                        ...layout,
                        sections: layout.sections.map((s, i) =>
                          i === navIdx && s.type === "navbar"
                            ? { ...s, props: { ...s.props, links: newLinks } }
                            : s,
                        ),
                      } as WebsiteLayout;
                      return updatePageLayoutWithHistory(withPage, homePage.id, updated);
                    });
                  }}
                  onRenamePage={(pageId, newName) => {
                    if (!activeProject) return;
                    updateProject(activeProject.id, (p) => renamePageInProject(p, pageId, newName));
                  }}
                  onRemovePage={(pageId) => {
                    if (!activeProject) return;
                    updateProject(activeProject.id, (p) => deletePageFromProject(p, pageId));
                  }}
                />
              )}

              {/* Input area */}
              <div className="border-t border-white/10 p-3">
                {showUrlInput ? (
                  <div className="mb-3 flex items-center gap-2">
                    <input
                      type="url"
                      value={urlInput}
                      onChange={(e) => setUrlInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleGenerateFromUrl();
                        if (e.key === "Escape") setShowUrlInput(false);
                      }}
                      placeholder="https://example.com"
                      className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-white/30 outline-none focus:border-orange-500/50"
                      disabled={isGenerating}
                      autoFocus
                    />
                    <button
                      onClick={handleGenerateFromUrl}
                      disabled={isGenerating || !urlInput.trim()}
                      className="rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-orange-600 disabled:opacity-50"
                    >
                      Generate
                    </button>
                    <button
                      onClick={() => setShowUrlInput(false)}
                      className="rounded-xl px-2 py-2.5 text-white/50 hover:text-white"
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowUrlInput(true)}
                    disabled={isGenerating}
                    className="mb-3 flex items-center gap-2 rounded-lg border border-dashed border-white/10 px-3 py-2 text-xs text-white/40 transition-colors hover:border-orange-500/30 hover:text-white/60"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                    </svg>
                    Generate from URL (e.g. example.com)
                  </button>
                )}
                {selectedImage && (
                  <div className="relative mb-3 inline-block">
                    <img
                      src={selectedImage}
                      alt="Selected reference"
                      className="h-20 w-auto rounded-lg border border-white/20 object-cover"
                    />
                    <button
                      onClick={() => setSelectedImage(null)}
                      className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] text-white hover:bg-red-600"
                    >
                      ✕
                    </button>
                  </div>
                )}
                <div className="relative flex items-center gap-2">
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    ref={fileInputRef}
                    onChange={handleImageUpload}
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isGenerating}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white/50 transition-colors hover:text-white disabled:opacity-50"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </button>
                  <div className="relative flex-1">
                    <textarea
                      ref={inputRef}
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={handleKeyDown}
                      onPaste={handlePaste}
                      placeholder={
                        selectedImage
                          ? "Build using this reference — replicate its UI and style exactly"
                          : activePage?.layout
                            ? "Describe what to change..."
                            : "What do you want to build?"
                      }
                      rows={2}
                      disabled={isGenerating}
                      className="w-full resize-none rounded-xl border border-white/10 bg-white/5 px-4 py-3 pr-12 text-sm text-white placeholder-white/30 outline-none transition-colors focus:border-orange-500/50 disabled:opacity-50"
                    />
                    <button
                      onClick={handleSubmit}
                      disabled={isGenerating || !input.trim()}
                      className="absolute bottom-3 right-3 flex h-7 w-7 items-center justify-center rounded-lg bg-orange-500 text-white transition-all hover:bg-orange-600 disabled:opacity-30"
                    >
                      <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14m-7-7l7 7-7 7" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
        </aside>
        <ResizeHandle
          onResize={(delta) => {
            setSidebarWidth((w) => {
              const next = Math.min(600, Math.max(280, w + delta));
              localStorage.setItem("mocha-sidebar-width", String(next));
              return next;
            });
          }}
        />
        </>
        )}

        {/* Preview area */}
        <main className="flex min-h-0 flex-1 flex-col overflow-hidden bg-[#111]">
          {/* Page tabs */}
          {activeProject && activeProject.pages.length > 0 && (
            <div className="flex min-w-0 shrink-0 flex-nowrap items-center gap-1 overflow-x-auto overflow-y-hidden border-b border-white/10 px-3 py-1.5">
              {activeProject.pages.map((page) => (
                <div
                  key={page.id}
                  className={`group flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs transition-colors ${page.id === activeProject.activePageId ? "bg-white/10 text-white" : "text-white/40 hover:bg-white/5 hover:text-white/60"}`}
                >
                  <button onClick={() => handleSwitchPage(page.id)}>
                    {page.name}
                  </button>
                  {activeProject.pages.length > 1 && (
                    <button
                      onClick={() => handleDeletePage(page.id)}
                      className="text-white/20 opacity-0 transition-all hover:text-red-400 group-hover:opacity-100"
                    >
                      &times;
                    </button>
                  )}
                </div>
              ))}
              {showNewPage ? (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleAddPage();
                  }}
                  className="flex items-center gap-1"
                >
                  <input
                    value={newPageName}
                    onChange={(e) => setNewPageName(e.target.value)}
                    placeholder="Page name"
                    autoFocus
                    className="w-24 rounded-md border border-white/20 bg-transparent px-2 py-1 text-xs text-white outline-none focus:border-orange-500"
                    onBlur={() => {
                      if (!newPageName.trim()) setShowNewPage(false);
                    }}
                  />
                </form>
              ) : (
                <button
                  onClick={() => setShowNewPage(true)}
                  className="rounded-lg px-2 py-1.5 text-xs text-white/30 transition-colors hover:bg-white/5 hover:text-white/50"
                >
                  + Add Page
                </button>
              )}
            </div>
          )}

          {/* Preview content */}
          <div className="flex-1 overflow-hidden">
            {!viewLayout ? (
              <div className="flex h-full items-center justify-center">
                <div className="text-center">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10">
                    <svg className="h-7 w-7 text-white/20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <p className="text-sm text-white/30">
                    {activePage?.name ?? "Page"} preview will appear here
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex h-full items-start gap-0 overflow-y-auto p-4 scroll-smooth">
                {editMode && activePage?.layout ? (
                  <PreviewEditProvider
                    editable
                    layout={activePage.layout}
                    onLayoutChange={(newLayout) => {
                      if (activeProject && activePage) {
                        updateProject(activeProject.id, (p) =>
                          updatePageLayoutWithHistory(p, activePage.id, newLayout),
                        );
                      }
                    }}
                    onThemeChange={
                      isSubPage && homePage
                        ? (newLayout) => {
                            if (activeProject && homePage?.layout) {
                              const layout = homePage.layout;
                              updateProject(activeProject.id, (p) =>
                                updatePageLayoutWithHistory(p, homePage!.id, {
                                  ...layout,
                                  theme: newLayout.theme,
                                  title: layout.title ?? "Untitled",
                                  description: layout.description ?? "",
                                }),
                              );
                            }
                          }
                        : undefined
                    }
                    homeLayout={isSubPage && homePage?.layout ? homePage.layout : undefined}
                    onHomeLayoutChange={
                      isSubPage && homePage
                        ? (newLayout) => {
                            if (activeProject && homePage) {
                              updateProject(activeProject.id, (p) =>
                                updatePageLayoutWithHistory(p, homePage.id, newLayout),
                              );
                            }
                          }
                        : undefined
                    }
                  >
                    <div
                      className="theme-panel sticky top-4 min-h-0 max-h-[calc(100vh-2rem)] shrink-0 overflow-y-scroll overflow-x-hidden rounded-xl pb-6"
                      style={{ width: themePanelWidth }}
                    >
                      <ThemeEditorPanel />
                    </div>
                    <ResizeHandle
                      onResize={(delta) => {
                        setThemePanelWidth((w) => {
                          const next = Math.min(420, Math.max(200, w + delta));
                          localStorage.setItem("mocha-theme-panel-width", String(next));
                          return next;
                        });
                      }}
                    />
                    <div
                      className={`min-w-0 flex-1 origin-top transition-all duration-300 ${previewScale === "mobile" ? "w-[375px] shrink-0 rounded-2xl border border-white/10 shadow-2xl" : ""}`}
                    >
                      <ErrorBoundary>
                        <DynamicPage
                          layout={viewLayout!}
                          onNavigate={handleNavigate}
                          editable
                          editLayout={activePage.layout}
                          sectionEditIndices={sectionEditIndices}
                        />
                      </ErrorBoundary>
                    </div>
                  </PreviewEditProvider>
                ) : (
                  <div
                    className={`origin-top transition-all duration-300 ${previewScale === "mobile" ? "w-[375px] rounded-2xl border border-white/10 shadow-2xl" : "w-full"}`}
                  >
                    <ErrorBoundary>
                      <DynamicPage layout={viewLayout!} onNavigate={handleNavigate} />
                    </ErrorBoundary>
                  </div>
                )}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

function LoadingDots() {
  return (
    <span className="inline-flex gap-1">
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-orange-500 [animation-delay:-0.3s]" />
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-orange-500 [animation-delay:-0.15s]" />
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-orange-500" />
    </span>
  );
}
