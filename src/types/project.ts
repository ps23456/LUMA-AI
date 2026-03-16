import type { WebsiteLayout } from "@/lib/schema/website-layout";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  layoutPageId?: string;
  imageUrl?: string;
}

export interface ProjectPage {
  id: string;
  name: string;
  layout: WebsiteLayout | null;
}

export interface Project {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  messages: ChatMessage[];
  pages: ProjectPage[];
  activePageId: string;
  /** Layout history per page for revert (last N layouts) */
  layoutHistory?: Record<string, WebsiteLayout[]>;
}
