"use client";

import React, { useState, useEffect, useRef } from "react";
import { PlayIcon } from "../icons/index";
import { CloseIcon } from "../icons/index";
import { StopIcon } from "../icons/index";

// ─── Types ───────────────────────────────────────────────────────────────────

type DialogView = "initial" | "create-room" | "join-room" | "active-session";

/** A user currently connected to the room */
export interface ConnectedUser {
  name: string;
}

export interface ShareDialogProps {
  isOpen: boolean;
  onClose: () => void;
  /** The current user's display name (from localStorage) */
  userName?: string;
  /** Called when the user clicks "Create Room" — plug in your backend call */
  onCreateRoom?: (roomName: string) => void | Promise<void>;
  /** Called when the user clicks "Join Room" — plug in your WS join logic */
  onJoinRoom?: (roomName: string) => void | Promise<void>;
  /** Called when the user clicks "Disconnect" */
  onStopSession?: () => void;
  /** If set, dialog opens directly in active-session mode (used by /room/[roomId]) */
  activeRoom?: string;
  /** List of users currently in the room (updated by parent from WS messages) */
  connectedUsers?: ConnectedUser[];
}

// ─── Shared styles ───────────────────────────────────────────────────────────

const dialogBg =
  "linear-gradient(145deg, #2a2a35 0%, #1e1e28 50%, #232330 100%)";
const accent = "#a8a5ff";
const accentHover = "#b8b5ff";

// ─── Reusable accent button ─────────────────────────────────────────────────

function AccentButton({
  id,
  children,
  onClick,
  className = "",
}: {
  id: string;
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <button
      id={id}
      onClick={onClick}
      className={`inline-flex items-center justify-center gap-2.5 px-8 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 cursor-pointer ${className}`}
      style={{ backgroundColor: accent, color: "#121212" }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = accentHover;
        e.currentTarget.style.transform = "scale(1.02)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = accent;
        e.currentTarget.style.transform = "scale(1)";
      }}
    >
      {children}
    </button>
  );
}

// ─── User avatar colors (deterministic by name) ─────────────────────────────

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

// ─── Styled input (reused for create/join) ──────────────────────────────────

function RoomInput({
  id,
  value,
  onChange,
  onEnter,
  placeholder,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  onEnter: () => void;
  placeholder: string;
}) {
  return (
    <input
      id={id}
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter") onEnter();
      }}
      placeholder={placeholder}
      autoFocus
      className="w-full px-4 py-3 rounded-lg text-sm text-[#f0f0f5] placeholder-[#555] outline-none transition-all duration-200"
      style={{
        backgroundColor: "rgba(0, 0, 0, 0.3)",
        border: "1.5px solid rgba(168, 165, 255, 0.25)",
      }}
      onFocus={(e) => {
        e.currentTarget.style.borderColor = "rgba(168, 165, 255, 0.5)";
        e.currentTarget.style.boxShadow = "0 0 0 3px rgba(168, 165, 255, 0.1)";
      }}
      onBlur={(e) => {
        e.currentTarget.style.borderColor = "rgba(168, 165, 255, 0.25)";
        e.currentTarget.style.boxShadow = "none";
      }}
    />
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function ShareDialog({
  isOpen,
  onClose,
  userName = "Anonymous",
  onCreateRoom,
  onJoinRoom,
  onStopSession,
  activeRoom,
  connectedUsers = [],
}: ShareDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const [view, setView] = useState<DialogView>(
    activeRoom ? "active-session" : "initial"
  );
  const [roomName, setRoomName] = useState("");
  const [activeRoomName, setActiveRoomName] = useState(activeRoom || "");

  // Reset on close (only when not in a room page)
  useEffect(() => {
    if (!isOpen && !activeRoom) {
      const t = setTimeout(() => {
        setView("initial");
        setRoomName("");
      }, 300);
      return () => clearTimeout(t);
    }
    if (isOpen && activeRoom) {
      setView("active-session");
      setActiveRoomName(activeRoom);
    }
  }, [isOpen, activeRoom]);

  // Escape to close
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  // Click outside to close
  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (dialogRef.current && !dialogRef.current.contains(e.target as Node)) {
      onClose();
    }
  };

  // Create room
  const handleCreateRoom = async () => {
    if (!roomName.trim()) return;
    const name = roomName.trim();
    setActiveRoomName(name);
    if (onCreateRoom) await onCreateRoom(name);
    setView("active-session");
  };

  // Join room
  const handleJoinRoom = async () => {
    if (!roomName.trim()) return;
    const name = roomName.trim();
    setActiveRoomName(name);
    if (onJoinRoom) await onJoinRoom(name);
    setView("active-session");
  };

  // Disconnect
  const handleDisconnect = () => {
    onStopSession?.();
    setActiveRoomName("");
    setRoomName("");
    setView("initial");
  };

  // Build the list of all users (current user + connected users)
  const allUsers: ConnectedUser[] = [
    { name: userName },
    ...connectedUsers.filter((u) => u.name !== userName),
  ];

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={handleBackdropClick}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      <div
        ref={dialogRef}
        className="relative w-full max-w-md mx-4 rounded-2xl overflow-hidden"
        style={{
          background: dialogBg,
          border: "1px solid rgba(255, 255, 255, 0.08)",
          boxShadow:
            "0 25px 60px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(168, 165, 255, 0.05)",
          animation: "shareDialogIn 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
        }}
      >
        {/* Close button */}
        <button
          id="btn-share-close"
          onClick={onClose}
          className="absolute top-3 right-3 w-7 h-7 flex items-center justify-center rounded-lg text-[#666] hover:text-[#999] hover:bg-white/5 transition-colors duration-150 cursor-pointer z-10"
          aria-label="Close"
        >
          <CloseIcon size={14} />
        </button>

        {/* ─── INITIAL VIEW ─── */}
        {view === "initial" && (
          <div className="px-8 pt-8 pb-9">
            <div className="text-center">
              <h2
                className="text-xl font-bold italic mb-2"
                style={{ color: accent }}
              >
                Live collaboration
              </h2>
              <p className="text-sm text-[#b4b4b4] mb-1.5">
                Collaborate on your drawing in real-time.
              </p>
              <p className="text-xs text-[#888] leading-relaxed mb-6 max-w-xs mx-auto">
                Create a new room or join an existing one to start collaborating.
              </p>

              {/* Start session */}
              <AccentButton
                id="btn-start-session"
                onClick={() => setView("create-room")}
              >
                <PlayIcon size={16} />
                Start session
              </AccentButton>
            </div>

            {/* Divider */}
            <div className="flex items-center gap-4 my-6">
              <div
                className="flex-1 h-px"
                style={{ backgroundColor: "rgba(255, 255, 255, 0.08)" }}
              />
              <span className="text-xs font-medium text-[#777]">Or</span>
              <div
                className="flex-1 h-px"
                style={{ backgroundColor: "rgba(255, 255, 255, 0.08)" }}
              />
            </div>

            {/* Join session */}
            <div className="text-center">
              <AccentButton
                id="btn-join-session"
                onClick={() => setView("join-room")}
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                  <polyline points="10 17 15 12 10 7" />
                  <line x1="15" y1="12" x2="3" y2="12" />
                </svg>
                Join session
              </AccentButton>
            </div>
          </div>
        )}

        {/* ─── CREATE ROOM VIEW ─── */}
        {view === "create-room" && (
          <div className="px-8 pt-8 pb-9">
            <div className="text-center mb-6">
              <h2
                className="text-xl font-bold italic mb-2"
                style={{ color: accent }}
              >
                Create a room
              </h2>
              <p className="text-sm text-[#b4b4b4]">
                Pick a name for your collaboration room.
              </p>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-[#ccc] mb-2">
                Room name
              </label>
              <RoomInput
                id="input-create-room-name"
                value={roomName}
                onChange={setRoomName}
                onEnter={handleCreateRoom}
                placeholder="e.g. design-brainstorm"
              />
            </div>

            <div className="flex items-center justify-between gap-3">
              <button
                id="btn-back-from-create"
                onClick={() => {
                  setView("initial");
                  setRoomName("");
                }}
                className="px-5 py-2.5 rounded-lg text-sm font-medium text-[#999] hover:text-[#ccc] hover:bg-white/5 transition-all duration-200 cursor-pointer"
                style={{ border: "1px solid rgba(255, 255, 255, 0.08)" }}
              >
                Back
              </button>
              <AccentButton
                id="btn-create-room"
                onClick={handleCreateRoom}
                className={!roomName.trim() ? "opacity-50 pointer-events-none" : ""}
              >
                Create Room
              </AccentButton>
            </div>
          </div>
        )}

        {/* ─── JOIN ROOM VIEW ─── */}
        {view === "join-room" && (
          <div className="px-8 pt-8 pb-9">
            <div className="text-center mb-6">
              <h2
                className="text-xl font-bold italic mb-2"
                style={{ color: accent }}
              >
                Join a room
              </h2>
              <p className="text-sm text-[#b4b4b4]">
                Enter the room name to join an active session.
              </p>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-[#ccc] mb-2">
                Room name
              </label>
              <RoomInput
                id="input-join-room-name"
                value={roomName}
                onChange={setRoomName}
                onEnter={handleJoinRoom}
                placeholder="e.g. design-brainstorm"
              />
            </div>

            <div className="flex items-center justify-between gap-3">
              <button
                id="btn-back-from-join"
                onClick={() => {
                  setView("initial");
                  setRoomName("");
                }}
                className="px-5 py-2.5 rounded-lg text-sm font-medium text-[#999] hover:text-[#ccc] hover:bg-white/5 transition-all duration-200 cursor-pointer"
                style={{ border: "1px solid rgba(255, 255, 255, 0.08)" }}
              >
                Back
              </button>
              <AccentButton
                id="btn-join-room"
                onClick={handleJoinRoom}
                className={!roomName.trim() ? "opacity-50 pointer-events-none" : ""}
              >
                Join Room
              </AccentButton>
            </div>
          </div>
        )}

        {/* ─── ACTIVE SESSION VIEW ─── */}
        {view === "active-session" && (
          <div className="px-8 pt-8 pb-9">
            {/* Header */}
            <div className="mb-6">
              <h2
                className="text-xl font-bold italic mb-1"
                style={{ color: accent }}
              >
                Live collaboration
              </h2>
              <p className="text-sm text-[#888]">
                Room:{" "}
                <span className="text-[#b4b4b4] font-medium">
                  {activeRoomName}
                </span>
              </p>
            </div>

            {/* Connected users */}
            <div className="mb-6">
              <p className="text-xs font-medium text-[#777] uppercase tracking-wider mb-3">
                Online — {allUsers.length}
              </p>
              <div className="flex flex-wrap gap-4">
                {allUsers.map((user, i) => {
                  const initial = user.name.charAt(0).toUpperCase();
                  const color = getAvatarColor(user.name);
                  const isYou = i === 0;

                  return (
                    <div
                      key={`${user.name}-${i}`}
                      className="flex flex-col items-center gap-1.5"
                    >
                      {/* Avatar circle */}
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
                        style={{
                          backgroundColor: color,
                          color: "#121212",
                          boxShadow: isYou
                            ? `0 0 0 2px #1e1e28, 0 0 0 3.5px ${accent}`
                            : "none",
                        }}
                      >
                        {initial}
                      </div>
                      {/* Name */}
                      <span className="text-xs text-[#999] max-w-[60px] truncate text-center">
                        {isYou ? "You" : user.name}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Divider */}
            <div
              className="h-px mb-6"
              style={{ backgroundColor: "rgba(255, 255, 255, 0.08)" }}
            />

            {/* Disconnect button */}
            <div className="flex justify-center">
              <button
                id="btn-disconnect"
                onClick={handleDisconnect}
                className="inline-flex items-center justify-center gap-2.5 px-8 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 cursor-pointer"
                style={{
                  backgroundColor: "transparent",
                  color: "#f5a5a5",
                  border: "1.5px solid rgba(245, 165, 165, 0.25)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor =
                    "rgba(245, 165, 165, 0.08)";
                  e.currentTarget.style.borderColor =
                    "rgba(245, 165, 165, 0.4)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "transparent";
                  e.currentTarget.style.borderColor =
                    "rgba(245, 165, 165, 0.25)";
                }}
              >
                <StopIcon size={14} color="#f5a5a5" />
                Disconnect
              </button>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes shareDialogIn {
          from { opacity: 0; transform: scale(0.95) translateY(10px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
    </div>
  );
}
