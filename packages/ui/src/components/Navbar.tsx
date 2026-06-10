"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Button } from "./Button";
import {
  HamburgerIcon,
  LockIcon,
  HandIcon,
  CursorIcon,
  RectangleToolIcon,
  DiamondToolIcon,
  CircleToolIcon,
  ArrowToolIcon,
  LineToolIcon,
  PenToolIcon,
  TextToolIcon,
  ImageToolIcon,
  EraserToolIcon,
  MoreToolsIcon,
  ClipboardIcon,
} from "../icons/index";

const fillableTools = new Set(["cursor", "rectangle", "diamond", "circle"]);

const tools = [
  { id: "lock", icon: LockIcon, shortcut: "" },
  { id: "hand", icon: HandIcon, shortcut: "" },
  { id: "cursor", icon: CursorIcon, shortcut: "1" },
  { id: "rectangle", icon: RectangleToolIcon, shortcut: "2" },
  { id: "diamond", icon: DiamondToolIcon, shortcut: "3" },
  { id: "circle", icon: CircleToolIcon, shortcut: "4" },
  { id: "arrow", icon: ArrowToolIcon, shortcut: "5" },
  { id: "line", icon: LineToolIcon, shortcut: "6" },
  { id: "pen", icon: PenToolIcon, shortcut: "7" },
  { id: "text", icon: TextToolIcon, shortcut: "8" },
  { id: "image", icon: ImageToolIcon, shortcut: "9" },
  { id: "eraser", icon: EraserToolIcon, shortcut: "0" },
  { id: "more", icon: MoreToolsIcon, shortcut: "" },
];

// Build a map of shortcut key → tool id
const shortcutMap: Record<string, string> = {};
tools.forEach((tool) => {
  if (tool.shortcut) {
    shortcutMap[tool.shortcut] = tool.id;
  }
});

export function Navbar() {
  const [activeTool, setActiveTool] = useState("cursor");
  const [isLocked, setIsLocked] = useState(false);

  // Keyboard shortcut handler
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Ignore if user is typing in an input/textarea
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

  const handleToolClick = (toolId: string) => {
    if (toolId === "lock") {
      setIsLocked((prev) => !prev);
    } else {
      setActiveTool(toolId);
    }
  };

  return (
    <nav className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-4 pt-5 pb-3">
      {/* Left — Hamburger menu */}
      <div className="flex items-center">
        <button
          id="btn-hamburger"
          className="flex items-center justify-center w-9 h-9 rounded-lg bg-[#232329] hover:bg-[#363636] text-[#b4b4b4] transition-colors duration-200 cursor-pointer"
          aria-label="Menu"
        >
          <HamburgerIcon size={18} />
        </button>
      </div>

      {/* Center — Toolbar (absolute center of screen) */}
      <div className="absolute left-1/2 -translate-x-1/2 flex items-center bg-[#232329] rounded-xl px-1.5 py-1.5 gap-1 shadow-lg shadow-black/30">
        {tools.map((tool) => {
          const Icon = tool.icon;
          const isActive = tool.id === "lock" ? isLocked : activeTool === tool.id;
          const isFillable = fillableTools.has(tool.id);

          // Build props for the icon
          const iconProps: Record<string, unknown> = { size: 15 };
          if (tool.id === "lock") {
            iconProps.locked = isLocked;
          }
          if (isFillable && isActive) {
            iconProps.filled = true;
          }

          return (
            <React.Fragment key={tool.id}>
              <button
                id={`tool-${tool.id}`}
                onClick={() => handleToolClick(tool.id)}
                className={`relative flex items-center justify-center w-9 h-9 rounded-lg transition-colors duration-150 cursor-pointer ${
                  isActive
                    ? "bg-[#4f3fad] text-white"
                    : "text-[#b4b4b4] hover:bg-[#2f2f35]"
                }`}
                aria-label={tool.id}
              >
                <Icon {...(iconProps as any)} />
                {tool.shortcut && (
                  <span className="absolute bottom-1 right-1 text-[9px] font-medium opacity-60 leading-none">
                    {tool.shortcut}
                  </span>
                )}
              </button>
              {(tool.id === "lock" || tool.id === "eraser") && (
                <div className="w-px h-6 bg-[#3a3a3a] mx-0.5" />
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Right — Action buttons */}
      <div className="flex items-center gap-2">
        <Button id="btn-excalidraw-plus" variant="default">
          Excalidraw+
        </Button>
        <Button id="btn-share" variant="primary">
          Share
        </Button>
        <Button id="btn-copy" variant="icon" ariaLabel="Copy to clipboard">
          <ClipboardIcon size={16} />
        </Button>
      </div>
    </nav>
  );
}
