"use client";

import {
  createContext,
  useContext,
  useCallback,
  useState,
  type ReactNode,
} from "react";
import type { WebsiteLayout } from "@/lib/schema/website-layout";
import { updateLayoutByPath } from "@/lib/utils/layout-update";

interface PreviewEditContextValue {
  editable: boolean;
  layout: WebsiteLayout;
  /** When on a sub-page, this is the home layout (has nav/hero). Use for theme panel landing controls. */
  layoutForTheme?: WebsiteLayout;
  /** When on a sub-page, use this to update home (nav, hero, theme). */
  onUpdateHome?: (path: string, value: unknown) => void;
  onUpdate: (path: string, value: unknown) => void;
  openEditor: (opts: {
    path: string;
    value: string;
    type: "text" | "paragraph" | "price" | "image" | "imageQuery" | "background";
    label?: string;
    /** When "home", updates go to home layout (for nav/hero edits on sub-pages). */
    updateTarget?: "current" | "home";
  }) => void;
  openThemeEditor: () => void;
  closeThemeEditor: () => void;
  closeEditor: () => void;
  editorState: {
    open: boolean;
    path: string | null;
    value: string;
    type: "text" | "paragraph" | "price" | "image" | "imageQuery" | "background";
    label?: string;
    updateTarget?: "current" | "home";
  } | null;
  themeEditorOpen: boolean;
}

const PreviewEditContext = createContext<PreviewEditContextValue | null>(null);

export function usePreviewEdit() {
  const ctx = useContext(PreviewEditContext);
  return ctx;
}

export function PreviewEditProvider({
  children,
  editable,
  layout,
  onLayoutChange,
  onThemeChange,
  homeLayout,
  onHomeLayoutChange,
}: {
  children: ReactNode;
  editable: boolean;
  layout: WebsiteLayout;
  onLayoutChange: (layout: WebsiteLayout) => void;
  onThemeChange?: (layout: WebsiteLayout) => void;
  homeLayout?: WebsiteLayout;
  onHomeLayoutChange?: (layout: WebsiteLayout) => void;
}) {
  const [editorState, setEditorState] = useState<PreviewEditContextValue["editorState"]>(null);
  const [themeEditorOpen, setThemeEditorOpen] = useState(false);

  const onUpdate = useCallback(
    (path: string, value: unknown) => {
      const updated = updateLayoutByPath(layout, path, value);
      if (path === "theme" && onThemeChange) {
        onThemeChange(updated);
      } else {
        onLayoutChange(updated);
      }
    },
    [layout, onLayoutChange, onThemeChange],
  );

  const openEditor = useCallback(
    (opts: { path: string; value: string; type: "text" | "paragraph" | "price" | "image" | "imageQuery" | "background"; label?: string; updateTarget?: "current" | "home" }) => {
      setEditorState({
        open: true,
        path: opts.path,
        value: opts.value,
        type: opts.type,
        label: opts.label,
        updateTarget: opts.updateTarget,
      });
    },
    [],
  );

  const closeEditor = useCallback(() => {
    setEditorState(null);
  }, []);

  const openThemeEditor = useCallback(() => setThemeEditorOpen(true), []);
  const closeThemeEditor = useCallback(() => setThemeEditorOpen(false), []);

  const onUpdateForTheme = useCallback(
    (path: string, value: unknown) => {
      if (homeLayout && onHomeLayoutChange && (path === "theme" || path.startsWith("sections."))) {
        const updated = updateLayoutByPath(homeLayout, path, value);
        onHomeLayoutChange(updated);
      } else {
        onUpdate(path, value);
      }
    },
    [homeLayout, onHomeLayoutChange, onUpdate],
  );

  const value: PreviewEditContextValue = {
    editable,
    layout,
    layoutForTheme: homeLayout ?? layout,
    onUpdateHome: homeLayout && onHomeLayoutChange ? onUpdateForTheme : undefined,
    onUpdate,
    openEditor,
    openThemeEditor,
    closeThemeEditor,
    closeEditor,
    editorState,
    themeEditorOpen,
  };

  return (
    <PreviewEditContext.Provider value={value}>
      {children}
    </PreviewEditContext.Provider>
  );
}
