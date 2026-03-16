import type { Project, ProjectPage, ChatMessage } from "@/types/project";
import type { WebsiteLayout } from "@/lib/schema/website-layout";

const STORAGE_KEY = "mocha-projects";
const ACTIVE_PROJECT_KEY = "mocha-active-project";

function generateId(): string {
  return crypto.randomUUID();
}

function createDefaultPage(): ProjectPage {
  return { id: generateId(), name: "Home", layout: null };
}

export function createProject(name: string = "Untitled Project"): Project {
  const page = createDefaultPage();
  return {
    id: generateId(),
    name,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    messages: [],
    pages: [page],
    activePageId: page.id,
  };
}

export function loadProjects(): Project[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as Project[];
  } catch {
    return [];
  }
}

/** Strip large blobs (base64 images in messages) to reduce storage when quota exceeded */
function createSlimProjects(projects: Project[]): Project[] {
  return projects.map((p) => ({
    ...p,
    messages: p.messages.map((m) => ({ ...m, imageUrl: undefined })),
  }));
}

export function saveProjects(projects: Project[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
  } catch (e) {
    if (e instanceof DOMException && e.name === "QuotaExceededError") {
      try {
        const slim = createSlimProjects(projects);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(slim));
      } catch {
        try {
          localStorage.removeItem(STORAGE_KEY);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(createSlimProjects(projects)));
        } catch {
          console.warn("Could not save projects to localStorage (quota exceeded)");
        }
      }
    } else {
      throw e;
    }
  }
}

export function loadActiveProjectId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(ACTIVE_PROJECT_KEY);
}

export function saveActiveProjectId(id: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(ACTIVE_PROJECT_KEY, id);
}

export function addPageToProject(project: Project, name: string): Project {
  const nameLower = name.toLowerCase().trim();
  const exists = project.pages.some(
    (p) => p.name.toLowerCase().trim() === nameLower,
  );
  if (exists) return project;
  const page: ProjectPage = { id: generateId(), name, layout: null };
  return {
    ...project,
    pages: [...project.pages, page],
    activePageId: page.id,
    updatedAt: new Date().toISOString(),
  };
}

const MAX_LAYOUT_HISTORY = 10;

export function pushLayoutToHistory(
  project: Project,
  pageId: string,
  currentLayout: WebsiteLayout | null,
): Project {
  if (!currentLayout) return project;
  const history = project.layoutHistory ?? {};
  const pageHistory = [...(history[pageId] ?? []), currentLayout].slice(-MAX_LAYOUT_HISTORY);
  return {
    ...project,
    layoutHistory: { ...history, [pageId]: pageHistory },
  };
}

export function revertLayout(
  project: Project,
  pageId: string,
): Project | null {
  const history = project.layoutHistory?.[pageId];
  if (!history || history.length === 0) return null;
  const previous = history[history.length - 1];
  const newHistory = history.slice(0, -1);
  const layoutHistory = { ...(project.layoutHistory ?? {}), [pageId]: newHistory };
  return {
    ...project,
    pages: project.pages.map((p) =>
      p.id === pageId ? { ...p, layout: previous } : p,
    ),
    layoutHistory: Object.keys(layoutHistory).length ? layoutHistory : undefined,
    updatedAt: new Date().toISOString(),
  };
}

export function hasLayoutHistory(project: Project, pageId: string): boolean {
  const history = project.layoutHistory?.[pageId];
  return Boolean(history && history.length > 0);
}

export function updatePageLayout(
  project: Project,
  pageId: string,
  layout: WebsiteLayout,
): Project {
  return {
    ...project,
    pages: project.pages.map((p) =>
      p.id === pageId ? { ...p, layout } : p,
    ),
    updatedAt: new Date().toISOString(),
  };
}

/** Update layout and push current layout to history first — enables revert for every change. */
export function updatePageLayoutWithHistory(
  project: Project,
  pageId: string,
  newLayout: WebsiteLayout,
): Project {
  const currentLayout = project.pages.find((p) => p.id === pageId)?.layout ?? null;
  const withHistory = pushLayoutToHistory(project, pageId, currentLayout);
  return updatePageLayout(withHistory, pageId, newLayout);
}

export function addMessage(
  project: Project,
  role: "user" | "assistant",
  content: string,
  layoutPageId?: string,
  imageUrl?: string,
): Project {
  const message: ChatMessage = {
    id: generateId(),
    role,
    content,
    timestamp: new Date().toISOString(),
    layoutPageId,
    imageUrl,
  };
  return {
    ...project,
    messages: [...project.messages, message],
    updatedAt: new Date().toISOString(),
  };
}

/** Remove the last assistant message with layoutPageId and the user message before it (used when reverting). */
export function removeLastLayoutMessages(
  project: Project,
  pageId: string,
): Project {
  const msgs = project.messages;
  const lastAssistantIdx = msgs.findLastIndex(
    (m) => m.role === "assistant" && m.layoutPageId === pageId,
  );
  if (lastAssistantIdx < 0) return project;
  const userIdx = msgs.findLastIndex(
    (m, i) => i < lastAssistantIdx && m.role === "user",
  );
  const toRemove = new Set<number>();
  toRemove.add(lastAssistantIdx);
  if (userIdx >= 0) toRemove.add(userIdx);
  const newMessages = msgs.filter((_, i) => !toRemove.has(i));
  return {
    ...project,
    messages: newMessages,
    updatedAt: new Date().toISOString(),
  };
}

export function renameProject(project: Project, name: string): Project {
  return { ...project, name, updatedAt: new Date().toISOString() };
}

export function renamePageInProject(
  project: Project,
  pageId: string,
  name: string,
): Project {
  return {
    ...project,
    pages: project.pages.map((p) =>
      p.id === pageId ? { ...p, name: name.trim() || p.name } : p,
    ),
    updatedAt: new Date().toISOString(),
  };
}

export function deletePageFromProject(
  project: Project,
  pageId: string,
): Project {
  const filtered = project.pages.filter((p) => p.id !== pageId);
  if (filtered.length === 0) {
    const page = createDefaultPage();
    return {
      ...project,
      pages: [page],
      activePageId: page.id,
      updatedAt: new Date().toISOString(),
    };
  }
  return {
    ...project,
    pages: filtered,
    activePageId:
      project.activePageId === pageId ? filtered[0].id : project.activePageId,
    updatedAt: new Date().toISOString(),
  };
}
