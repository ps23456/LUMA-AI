"use client";

import { useRef } from "react";

interface ResizeHandleProps {
  onResize: (delta: number) => void;
  direction?: "horizontal" | "vertical";
  className?: string;
}

export function ResizeHandle({ onResize, direction = "horizontal", className = "" }: ResizeHandleProps) {
  const lastPos = useRef(0);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    lastPos.current = direction === "horizontal" ? e.clientX : e.clientY;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const current = direction === "horizontal" ? moveEvent.clientX : moveEvent.clientY;
      const delta = current - lastPos.current;
      lastPos.current = current;
      onResize(delta);
    };

    const handleMouseUp = () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    document.body.style.cursor = direction === "horizontal" ? "col-resize" : "row-resize";
    document.body.style.userSelect = "none";
  };

  return (
    <div
      role="separator"
      aria-orientation={direction}
      onMouseDown={handleMouseDown}
      title="Drag to resize"
      className={`group shrink-0 touch-none select-none transition-colors hover:bg-orange-500/15 ${
        direction === "vertical" ? "cursor-row-resize" : "cursor-col-resize"
      } ${className}`}
      style={{ width: direction === "horizontal" ? 8 : "100%", height: direction === "horizontal" ? "100%" : 8 }}
    >
      <div
        className={`flex items-center justify-center ${
          direction === "horizontal" ? "h-full w-full" : "h-full w-full"
        }`}
      >
        <div
          className={`rounded-full bg-white/20 transition-colors group-hover:bg-orange-500/60 ${
            direction === "horizontal" ? "h-12 w-1" : "h-1 w-12"
          }`}
        />
      </div>
    </div>
  );
}
