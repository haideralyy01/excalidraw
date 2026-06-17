"use client";

import React, { useState, useEffect, useCallback } from "react";

export type ToolId =
  | "lock"
  | "hand"
  | "cursor"
  | "rectangle"
  | "diamond"
  | "circle"
  | "arrow"
  | "line"
  | "pen"
  | "text"
  | "image"
  | "eraser"
  | "more";
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

export const tools: { id: ToolId; icon: React.ComponentType<any>; shortcut: string }[] = [
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
export const shortcutMap: Record<string, ToolId> = {};
tools.forEach((tool) => {
  if (tool.shortcut) {
    shortcutMap[tool.shortcut] = tool.id;
  }
});

// ─── Component 1: Hamburger Menu (top-left) ─────────────────────────────────

export function HamburgerMenu() {
  return (
    <div className="fixed top-5 left-4 z-20 flex items-center">
      <button
        id="btn-hamburger"
        className="flex items-center justify-center w-9 h-9 rounded-lg bg-[#232329] hover:bg-[#363636] text-[#b4b4b4] transition-colors duration-200 cursor-pointer shadow-lg shadow-black/30"
        aria-label="Menu"
      >
        <HamburgerIcon size={18} />
      </button>
    </div>
  );
}

// ─── Component 2: Main Toolbar (top-center) ─────────────────────────────────

interface MainToolbarProps {
  activeTool: ToolId;
  onToolChange: (toolId: ToolId) => void;
}

export function MainToolbar({ activeTool, onToolChange }: MainToolbarProps) {
  const [isLocked, setIsLocked] = useState(false);

  const handleToolClick = (toolId: ToolId) => {
    if (toolId === "lock") {
      setIsLocked((prev) => !prev);
    } else {
      onToolChange(toolId);
    }
  };

  return (
    <div className="fixed top-5 left-1/2 -translate-x-1/2 z-20 flex items-center bg-[#232329] rounded-xl px-1.5 py-1.5 gap-1 shadow-lg shadow-black/30">
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
                  ? "bg-[#403e6a] text-white"
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
  );
}

// ─── Component 3: Action Buttons (top-right) ────────────────────────────────

interface ActionButtonsProps {
  onShareClick?: () => void;
  /** When true, the Share button turns light green to indicate an active session */
  isInRoom?: boolean;
}

export function ActionButtons({ onShareClick, isInRoom }: ActionButtonsProps) {
  return (
    <div className="fixed top-5 right-4 z-20 flex items-center gap-2">
      <Button id="btn-excalidraw-plus" variant="default">
        Excalidraw+
      </Button>
      <Button id="btn-share" variant={isInRoom ? "active" : "primary"} onClick={onShareClick}>
        Share
      </Button>
      <Button id="btn-copy" variant="icon" ariaLabel="Copy to clipboard">
        <ClipboardIcon size={14} />
      </Button>
    </div>
  );
}

// ─── Component 4: Zoom Controls (bottom-left) ──────────────────────────────

interface ZoomControlsProps {
  zoom?: number;
  onZoomChange?: (zoom: number) => void;
  onUndo?: () => void;
  onRedo?: () => void;
}

export function ZoomControls({ zoom = 100, onZoomChange, onUndo, onRedo }: ZoomControlsProps) {
  const handleZoomIn = () => {
    onZoomChange?.(Math.min(zoom + 10, 300));
  };

  const handleZoomOut = () => {
    onZoomChange?.(Math.max(zoom - 10, 10));
  };

  return (
    <div className="fixed bottom-4 left-4 z-20 flex items-center gap-2">
      {/* Zoom group */}
      <div className="flex items-center bg-[#232329] rounded-lg shadow-lg shadow-black/30 overflow-hidden">
        <button
          id="btn-zoom-out"
          onClick={handleZoomOut}
          className="flex items-center justify-center w-9 h-9 text-[#b4b4b4] hover:bg-[#2f2f35] transition-colors duration-150 cursor-pointer"
          aria-label="Zoom out"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>
        <span className="px-3 text-xs font-medium text-[#b4b4b4] select-none min-w-12 text-center">
          {zoom}%
        </span>
        <button
          id="btn-zoom-in"
          onClick={handleZoomIn}
          className="flex items-center justify-center w-9 h-9 text-[#b4b4b4] hover:bg-[#2f2f35] transition-colors duration-150 cursor-pointer"
          aria-label="Zoom in"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>
      </div>

      {/* Undo / Redo group */}
      <div className="flex items-center bg-[#232329] rounded-lg shadow-lg shadow-black/30 overflow-hidden">
        <button
          id="btn-undo"
          onClick={onUndo}
          className="flex items-center justify-center w-9 h-9 text-[#b4b4b4] hover:bg-[#2f2f35] transition-colors duration-150 cursor-pointer"
          aria-label="Undo"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 10h10a5 5 0 0 1 5 5v0a5 5 0 0 1-5 5H8" />
            <polyline points="7 14 3 10 7 6" />
          </svg>
        </button>
        <button
          id="btn-redo"
          onClick={onRedo}
          className="flex items-center justify-center w-9 h-9 text-[#b4b4b4] hover:bg-[#2f2f35] transition-colors duration-150 cursor-pointer"
          aria-label="Redo"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 10H11a5 5 0 0 0-5 5v0a5 5 0 0 0 5 5h5" />
            <polyline points="17 14 21 10 17 6" />
          </svg>
        </button>
      </div>
    </div>
  );
}

// ─── Legacy Wrapper (backward compatibility) ────────────────────────────────

export function Navbar() {
  const [activeTool, setActiveTool] = useState<ToolId>("cursor");
  return (
    <>
      <HamburgerMenu />
      <MainToolbar activeTool={activeTool} onToolChange={setActiveTool} />
      <ActionButtons />
      <ZoomControls />
    </>
  );
}
