"use client";

import { useState, useEffect, useCallback } from "react";
import { Canvas } from "@repo/ui/components/Canvas";
import {
  HamburgerMenu,
  MainToolbar,
  ActionButtons,
  ZoomControls,
  shortcutMap,
} from "@repo/ui/components/Navbar";
import type { ToolId } from "@repo/ui/components/Navbar";

export default function Home() {
  const [zoom, setZoom] = useState(100);
  const [activeTool, setActiveTool] = useState<ToolId>("cursor");

  // Keyboard shortcut handler (lifted from MainToolbar)
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    const tag = (e.target as HTMLElement).tagName;
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

    const toolId = shortcutMap[e.key];
    if (toolId) {
      setActiveTool(toolId);
    }
  }, []);

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  return (
    <div className="relative w-screen h-screen overflow-hidden">
      {/* Full-screen canvas surface */}
      <Canvas zoom={zoom} onZoomChange={setZoom} activeTool={activeTool} />

      {/* Floating navbar components rendered on top of the canvas */}
      <HamburgerMenu />
      <MainToolbar activeTool={activeTool} onToolChange={setActiveTool} />
      <ActionButtons />
      <ZoomControls zoom={zoom} onZoomChange={setZoom} />
    </div>
  );
}
