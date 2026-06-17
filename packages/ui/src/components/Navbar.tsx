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

// ─── Avatar color helper ─────────────────────────────────────────────────────

const avatarColors = [
  "#6bcf7f", "#f5a5a5", "#a5c8f5", "#f5d5a5", "#c5a5f5",
  "#a5f5e0", "#f5a5d5", "#d5f5a5", "#f5c5a5", "#a5b5f5",
];

function getAvatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return avatarColors[Math.abs(hash) % avatarColors.length] || avatarColors[0]!;
}

// ─── Component 3: Action Buttons (top-right) ────────────────────────────────

interface ActionButtonsProps {
  onShareClick?: () => void;
  /** When true, the Share button turns light green to indicate an active session */
  isInRoom?: boolean;
  /** Number of active users in the room (including self) */
  activeUserCount?: number;
  /** The logged-in user's display name */
  userName?: string;
  /** Whether the user is logged in */
  isLoggedIn?: boolean;
  /** Called when the Login button is clicked */
  onLoginClick?: () => void;
}

export function ActionButtons({
  onShareClick,
  isInRoom,
  activeUserCount = 0,
  userName,
  isLoggedIn,
  onLoginClick,
}: ActionButtonsProps) {
  const initial = userName ? userName.charAt(0).toUpperCase() : "";
  const color = userName ? getAvatarColor(userName) : "#a8a5ff";

  return (
    <div className="fixed top-5 right-4 z-20 flex items-center gap-2">
      {/* Profile avatar (logged in) */}
      {isLoggedIn && userName && (
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 cursor-default"
          style={{ backgroundColor: color, color: "#121212" }}
          title={userName}
        >
          {initial}
        </div>
      )}
      {/* Login button (not logged in) */}
      {!isLoggedIn && (
        <Button id="btn-login" variant="default" onClick={onLoginClick}>
          Login
        </Button>
      )}
      <div className="relative">
        <Button id="btn-share" variant={isInRoom ? "active" : "primary"} onClick={onShareClick}>
          Share
        </Button>
        {/* Active user count badge */}
        {isInRoom && activeUserCount > 0 && (
          <span
            className="absolute -bottom-1.5 -right-1.5 flex items-center justify-center min-w-5 h-5 px-1 rounded-full text-[10px] font-bold shadow-lg pointer-events-none"
            style={{
              backgroundColor: "#1b7d3a",
              color: "#ffffff",
              border: "2px solid #232329",
            }}
          >
            {activeUserCount}
          </span>
        )}
      </div>
      <Button id="btn-copy" variant="icon" ariaLabel="Copy to clipboard">
        <ClipboardIcon size={14} />
      </Button>
    </div>
  );
}

// ─── Zoom Controls (re-exported from ZoomControls.tsx) ──────────────────────

import { ZoomControls } from "./ZoomControls";
export { ZoomControls };
export type { ZoomControlsProps } from "./ZoomControls";

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

