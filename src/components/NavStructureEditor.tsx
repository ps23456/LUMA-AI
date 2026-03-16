"use client";

import { useCallback, useEffect, useState, useRef } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import type { ProjectPage } from "@/types/project";

export interface NavLinkNode {
  id: string;
  label: string;
  href: string;
  children: NavLinkNode[];
  pageId?: string;
}

function toSlug(name: string): string {
  return name.toLowerCase().replace(/[\s\-_]+/g, "");
}

function toHref(name: string): string {
  const slug = toSlug(name);
  return slug === "home" ? "#home" : `#${slug}`;
}

function linksToTree(
  links: Array<{ label: string; href: string; children?: Array<{ label: string; href: string }> }>,
  pages: ProjectPage[],
): NavLinkNode[] {
  const pageBySlug = new Map<string, ProjectPage>();
  for (const p of pages) {
    pageBySlug.set(toSlug(p.name), p);
  }
  const inNav = new Set<string>();
  const addToInNav = (l: { label: string; href: string; children?: Array<{ label: string; href: string }> }) => {
    inNav.add(toSlug(l.label));
    for (const c of l.children ?? []) inNav.add(toSlug(c.label));
  };
  links.forEach(addToInNav);

  const nodes: NavLinkNode[] = links.map((l, i) => {
    const slug = (l.href || "").replace(/^#/, "") || toSlug(l.label);
    const pageId = pageBySlug.get(slug)?.id;
    return {
      id: `nav-${i}-${l.label}`,
      label: l.label,
      href: l.href || toHref(l.label),
      pageId,
      children: (l.children ?? []).map((c, j) => ({
        id: `nav-${i}-${j}-${c.label}`,
        label: c.label,
        href: c.href || toHref(c.label),
        pageId: pageBySlug.get((c.href || "").replace(/^#/, "") || toSlug(c.label))?.id,
        children: [],
      })),
    };
  });

  const orphans = pages.filter((p) => !inNav.has(toSlug(p.name)));
  for (let i = 0; i < orphans.length; i++) {
    const p = orphans[i];
    nodes.push({
      id: `orphan-${p.id}`,
      label: p.name,
      href: toHref(p.name),
      pageId: p.id,
      children: [],
    });
  }
  return nodes;
}

function treeToLinks(nodes: NavLinkNode[]): Array<{ label: string; href: string; children?: Array<{ label: string; href: string }> }> {
  return nodes.map((n) => ({
    label: n.label,
    href: n.href,
    ...(n.children.length > 0 ? { children: n.children.map((c) => ({ label: c.label, href: c.href })) } : {}),
  }));
}

function collectAllNodes(nodes: NavLinkNode[]): NavLinkNode[] {
  const out: NavLinkNode[] = [];
  for (const n of nodes) {
    out.push(n);
    out.push(...collectAllNodes(n.children));
  }
  return out;
}

function removeNodeFromTree(nodes: NavLinkNode[], id: string): NavLinkNode[] {
  return nodes
    .filter((n) => n.id !== id)
    .map((n) => ({ ...n, children: removeNodeFromTree(n.children, id) }));
}

function addChildToNode(nodes: NavLinkNode[], parentId: string, child: NavLinkNode): NavLinkNode[] {
  return nodes.map((n) => {
    if (n.id === parentId) {
      return { ...n, children: [...n.children, { ...child, id: `nav-${Date.now()}-${child.label}` }] };
    }
    return { ...n, children: addChildToNode(n.children, parentId, child) };
  });
}

function updateNodeLabel(nodes: NavLinkNode[], id: string, newLabel: string): NavLinkNode[] {
  return nodes.map((n) => {
    if (n.id === id) return { ...n, label: newLabel, href: toHref(newLabel) };
    return { ...n, children: updateNodeLabel(n.children, id, newLabel) };
  });
}

type NavLink = { label: string; href: string; children?: NavLink[] };

interface NavStructureEditorProps {
  homePage: ProjectPage | null;
  pages: ProjectPage[];
  onUpdateNav: (links: NavLink[]) => void;
  onAddPage: (name: string) => void;
  onRenamePage: (pageId: string, newName: string) => void;
  onRemovePage: (pageId: string) => void;
}

export function NavStructureEditor({
  homePage,
  pages,
  onUpdateNav,
  onAddPage,
  onRenamePage,
  onRemovePage,
}: NavStructureEditorProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [showAddInput, setShowAddInput] = useState(false);
  const [addPageName, setAddPageName] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const editInputRef = useRef<HTMLInputElement>(null);
  const addInputRef = useRef<HTMLInputElement>(null);

  const navSection = homePage?.layout?.sections?.find((s) => s.type === "navbar");
  const currentLinks = navSection?.type === "navbar" ? (navSection as { props?: { links?: NavLink[] } }).props?.links ?? [] : [] as NavLink[];
  const [tree, setTree] = useState<NavLinkNode[]>(() => linksToTree(currentLinks, pages));

  useEffect(() => {
    const nav = homePage?.layout?.sections?.find((s) => s.type === "navbar");
    const links = nav?.type === "navbar" ? (nav as { props?: { links?: NavLink[] } }).props?.links ?? [] : [];
    if (links.length > 0 || pages.length > 0) setTree(linksToTree(links, pages));
  }, [homePage?.layout, pages]);

  useEffect(() => {
    if (editingId) {
      editInputRef.current?.focus();
      editInputRef.current?.select();
    }
  }, [editingId]);

  useEffect(() => {
    if (showAddInput) addInputRef.current?.focus();
  }, [showAddInput]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
  );

  const handleDragStart = useCallback((e: DragStartEvent) => {
    setActiveId(e.active.id as string);
  }, []);

  const isDescendantOf = useCallback(
    (nodeId: string, potentialAncestorId: string): boolean => {
      const ancestor = collectAllNodes(tree).find((n) => n.id === potentialAncestorId);
      if (!ancestor) return false;
      const descendants = collectAllNodes(ancestor.children);
      return descendants.some((n) => n.id === nodeId) || ancestor.id === nodeId;
    },
    [tree],
  );

  const handleDragEnd = useCallback(
    (e: DragEndEvent) => {
      setActiveId(null);
      const { active, over } = e;
      if (!over || active.id === over.id) return;

      const allNodes = collectAllNodes(tree);
      const dragged = allNodes.find((n) => n.id === active.id);
      const overNode = allNodes.find((n) => n.id === over.id);
      if (!dragged || !overNode) return;

      if (isDescendantOf(over.id as string, dragged.id)) return;

      const newTree = removeNodeFromTree(tree, dragged.id);
      const added = addChildToNode(newTree, over.id as string, dragged);
      const links = treeToLinks(added);
      setTree(added);
      onUpdateNav(links);
    },
    [tree, onUpdateNav, isDescendantOf],
  );

  const handleAddPage = useCallback(() => {
    const name = addPageName.trim();
    if (!name) return;
    onAddPage(name);
    setAddPageName("");
    setShowAddInput(false);
  }, [addPageName, onAddPage]);

  const handleRenameSubmit = useCallback(
    (nodeId: string, newLabel: string) => {
      const node = collectAllNodes(tree).find((n) => n.id === nodeId);
      if (!node || !newLabel.trim()) {
        setEditingId(null);
        return;
      }
      if (node.pageId) onRenamePage(node.pageId, newLabel.trim());
      const updated = updateNodeLabel(tree, nodeId, newLabel.trim());
      setTree(updated);
      onUpdateNav(treeToLinks(updated));
      setEditingId(null);
    },
    [tree, onRenamePage, onUpdateNav],
  );

  const handleRemove = useCallback(
    (nodeId: string) => {
      const node = collectAllNodes(tree).find((n) => n.id === nodeId);
      if (!node) return;
      const newTree = removeNodeFromTree(tree, nodeId);
      setTree(newTree);
      onUpdateNav(treeToLinks(newTree));
      if (node.pageId) onRemovePage(node.pageId);
      setSelectedId(null);
    },
    [tree, onUpdateNav, onRemovePage],
  );

  const handlePromoteToMain = useCallback(
    (nodeId: string) => {
      const node = collectAllNodes(tree).find((n) => n.id === nodeId);
      if (!node) return;
      const without = removeNodeFromTree(tree, nodeId);
      const promoted = { ...node, children: [], id: `nav-${Date.now()}-${node.label}` };
      const added = [...without, promoted];
      setTree(added);
      onUpdateNav(treeToLinks(added));
      setSelectedId(null);
    },
    [tree, onUpdateNav],
  );

  const expandAll = useCallback(() => {
    setExpanded(new Set(collectAllNodes(tree).map((n) => n.id)));
  }, [tree]);

  const collapseAll = useCallback(() => {
    setExpanded(new Set());
  }, []);

  const activeNode = activeId ? collectAllNodes(tree).find((n) => n.id === activeId) : null;

  if (!homePage?.layout || pages.length === 0) return null;

  return (
    <div className="border-t border-white/10">
      <button
        onClick={() => setExpanded((s) => (s.has("nav") ? new Set() : new Set(["nav"])))}
        className="flex w-full items-center justify-between px-4 py-2.5 text-left text-xs font-medium text-white/70 hover:bg-white/5"
      >
        <span className="flex items-center gap-2">
          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
          Pages & Navigation
        </span>
        <svg
          className={`h-3.5 w-3.5 transition-transform ${expanded.has("nav") ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {expanded.has("nav") && (
        <div className="flex max-h-[280px] flex-col border-t border-white/5 px-4 pb-3 pt-1">
          <p className="mb-2 shrink-0 text-[10px] text-white/40">
            Drag a page onto another to make it a sub-page (dropdown).
          </p>

          {/* Hot options bar */}
          <div className="mb-3 flex shrink-0 flex-wrap gap-1.5">
            <button
              onClick={() => setShowAddInput(true)}
              className="flex items-center gap-1 rounded-lg bg-orange-500/20 px-2.5 py-1.5 text-[10px] font-semibold text-orange-400 transition-colors hover:bg-orange-500/30"
            >
              <span className="text-xs">+</span> Add Page
            </button>
            <button
              onClick={expandAll}
              className="rounded-lg bg-white/5 px-2.5 py-1.5 text-[10px] text-white/60 transition-colors hover:bg-white/10 hover:text-white/80"
            >
              Expand all
            </button>
            <button
              onClick={collapseAll}
              className="rounded-lg bg-white/5 px-2.5 py-1.5 text-[10px] text-white/60 transition-colors hover:bg-white/10 hover:text-white/80"
            >
              Collapse all
            </button>
            {selectedId && (
              <button
                onClick={() => handlePromoteToMain(selectedId)}
                className="rounded-lg bg-emerald-500/20 px-2.5 py-1.5 text-[10px] font-medium text-emerald-400 transition-colors hover:bg-emerald-500/30"
              >
                Promote to main
              </button>
            )}
          </div>

          {/* Add page input */}
          {showAddInput && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleAddPage();
              }}
              className="mb-3 flex shrink-0 gap-2"
            >
              <input
                ref={addInputRef}
                type="text"
                value={addPageName}
                onChange={(e) => setAddPageName(e.target.value)}
                onBlur={() => {
                  if (!addPageName.trim()) setShowAddInput(false);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Escape") {
                    setShowAddInput(false);
                    setAddPageName("");
                  }
                }}
                placeholder="Page name"
                className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-white placeholder-white/30 outline-none focus:border-orange-500/50"
              />
              <button
                type="submit"
                disabled={!addPageName.trim()}
                className="rounded-lg bg-orange-500 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-orange-600 disabled:opacity-50"
              >
                Add
              </button>
            </form>
          )}

          <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
            <div className="min-h-0 flex-1 overflow-y-auto">
              <NavTree
                nodes={tree}
                expanded={expanded}
                setExpanded={setExpanded}
                editingId={editingId}
                editValue={editValue}
                setEditingId={setEditingId}
                setEditValue={setEditValue}
                onRenameSubmit={handleRenameSubmit}
                onRemove={handleRemove}
                selectedId={selectedId}
                setSelectedId={setSelectedId}
                editInputRef={editInputRef}
              />
            </div>
            <DragOverlay>
              {activeNode ? (
                <div className="rounded-lg border border-orange-500/50 bg-[#1a1a1a] px-3 py-2 text-xs font-medium text-white shadow-lg">
                  {activeNode.label}
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        </div>
      )}
    </div>
  );
}

function NavTree({
  nodes,
  expanded,
  setExpanded,
  editingId,
  editValue,
  setEditingId,
  setEditValue,
  onRenameSubmit,
  onRemove,
  selectedId,
  setSelectedId,
  editInputRef,
}: {
  nodes: NavLinkNode[];
  expanded: Set<string>;
  setExpanded: React.Dispatch<React.SetStateAction<Set<string>>>;
  editingId: string | null;
  editValue: string;
  setEditingId: (id: string | null) => void;
  setEditValue: (v: string) => void;
  onRenameSubmit: (id: string, label: string) => void;
  onRemove: (id: string) => void;
  selectedId: string | null;
  setSelectedId: (id: string | null) => void;
  editInputRef: React.RefObject<HTMLInputElement | null>;
}) {
  return (
    <div className="space-y-0.5">
      {nodes.map((node) => (
        <NavTreeNode
          key={node.id}
          node={node}
          expanded={expanded}
          setExpanded={setExpanded}
          depth={0}
          editingId={editingId}
          editValue={editValue}
          setEditingId={setEditingId}
          setEditValue={setEditValue}
          onRenameSubmit={onRenameSubmit}
          onRemove={onRemove}
          selectedId={selectedId}
          setSelectedId={setSelectedId}
          editInputRef={editInputRef}
        />
      ))}
    </div>
  );
}

function NavTreeNode({
  node,
  expanded,
  setExpanded,
  depth,
  editingId,
  editValue,
  setEditingId,
  setEditValue,
  onRenameSubmit,
  onRemove,
  selectedId,
  setSelectedId,
  editInputRef,
}: {
  node: NavLinkNode;
  expanded: Set<string>;
  setExpanded: React.Dispatch<React.SetStateAction<Set<string>>>;
  depth: number;
  editingId: string | null;
  editValue: string;
  setEditingId: (id: string | null) => void;
  setEditValue: (v: string) => void;
  onRenameSubmit: (id: string, label: string) => void;
  onRemove: (id: string) => void;
  selectedId: string | null;
  setSelectedId: (id: string | null) => void;
  editInputRef: React.RefObject<HTMLInputElement | null>;
}) {
  const hasChildren = node.children.length > 0;
  const isExpanded = expanded.has(node.id);
  const isEditing = editingId === node.id;
  const isSelected = selectedId === node.id;

  const { attributes, listeners, setNodeRef: setDragRef, isDragging } = useDraggable({ id: node.id, data: node });
  const { setNodeRef: setDropRef, isOver } = useDroppable({ id: node.id });

  const ref = (el: HTMLDivElement | null) => {
    setDragRef(el);
    setDropRef(el);
  };

  const startEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(node.id);
    setEditValue(node.label);
  };

  return (
    <>
      <div
        ref={ref}
        {...(isEditing ? {} : attributes)}
        {...(isEditing ? {} : listeners)}
        onClick={() => setSelectedId(node.id)}
        className={`group flex cursor-grab items-center gap-2 rounded-lg px-2 py-1.5 text-xs transition-colors active:cursor-grabbing ${
          isDragging ? "opacity-50" : ""
        } ${isOver ? "bg-orange-500/20 ring-1 ring-orange-500/40" : "hover:bg-white/5"} ${isSelected ? "ring-1 ring-orange-500/30" : ""}`}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
      >
        {hasChildren ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setExpanded((prev) => {
                const next = new Set(prev);
                if (next.has(node.id)) next.delete(node.id);
                else next.add(node.id);
                return next;
              });
            }}
            className="text-white/40 hover:text-white/70"
          >
            <svg
              className={`h-3 w-3 transition-transform ${isExpanded ? "rotate-90" : ""}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        ) : (
          <span className="w-3" />
        )}
        {isEditing ? (
          <input
            ref={editInputRef as React.RefObject<HTMLInputElement>}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={() => onRenameSubmit(node.id, editValue)}
            onKeyDown={(e) => {
              if (e.key === "Enter") onRenameSubmit(node.id, editValue);
              if (e.key === "Escape") setEditingId(null);
            }}
            onClick={(e) => e.stopPropagation()}
            className="flex-1 min-w-0 rounded border border-orange-500/50 bg-white/5 px-2 py-1 text-xs text-white outline-none focus:border-orange-500"
          />
        ) : (
          <span
            onDoubleClick={startEdit}
            className="flex-1 truncate"
          >
            {node.label}
          </span>
        )}
        {hasChildren && !isEditing && (
          <span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] text-white/50">
            {node.children.length}
          </span>
        )}
        {!isEditing && (
          <div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
            <button
              type="button"
              onClick={startEdit}
              className="rounded p-1 text-white/40 hover:bg-white/10 hover:text-white/70"
              title="Rename"
            >
              <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onRemove(node.id);
              }}
              className="rounded p-1 text-white/40 hover:bg-red-500/20 hover:text-red-400"
              title="Remove"
            >
              <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        )}
      </div>
      {hasChildren && isExpanded && (
        <div className="space-y-0.5">
          {node.children.map((child) => (
            <NavTreeNode
              key={child.id}
              node={child}
              expanded={expanded}
              setExpanded={setExpanded}
              depth={depth + 1}
              editingId={editingId}
              editValue={editValue}
              setEditingId={setEditingId}
              setEditValue={setEditValue}
              onRenameSubmit={onRenameSubmit}
              onRemove={onRemove}
              selectedId={selectedId}
              setSelectedId={setSelectedId}
              editInputRef={editInputRef}
            />
          ))}
        </div>
      )}
    </>
  );
}
