"use client";

import { useState, useEffect, useCallback, useRef, use } from "react";
import { useRouter } from "next/navigation";
import { Canvas } from "@repo/ui/components/Canvas";
import {
  HamburgerMenu,
  MainToolbar,
  ActionButtons,
  ZoomControls,
  shortcutMap,
} from "@repo/ui/components/Navbar";
import type { ToolId } from "@repo/ui/components/Navbar";
import { ShareDialog } from "@repo/ui/components/ShareDialog";
import type { ConnectedUser } from "@repo/ui/components/ShareDialog";
import { ToastContainer, useToasts } from "@repo/ui/components/Toast";
import axios from "axios";
import {
  connectToWebSocket,
  disconnectFromWebSocket,
  onWebSocketMessage,
} from "../../../lib/websocket";

const API_BASE = "http://localhost:8000/api/v1";

interface RoomPageProps {
  params: Promise<{ roomId: string }>;
}

export default function RoomPage({ params }: RoomPageProps) {
  const { roomId } = use(params);
  const router = useRouter();
  const roomName = decodeURIComponent(roomId);

  const [zoom, setZoom] = useState(100);
  const [activeTool, setActiveTool] = useState<ToolId>("cursor");
  const [isShareOpen, setIsShareOpen] = useState(true);
  const [userName, setUserName] = useState("");
  const [connectedUsers, setConnectedUsers] = useState<ConnectedUser[]>([]);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const { toasts, addToast, dismissToast } = useToasts();

  const undoRef = useRef<(() => void) | null>(null);
  const redoRef = useRef<(() => void) | null>(null);
  const hasConnected = useRef(false);

  // Load user name from localStorage
  useEffect(() => {
    const storedName = localStorage.getItem("userName");
    if (storedName) setUserName(storedName);
  }, []);

  // ── Connect to WebSocket on mount ──
  useEffect(() => {
    if (hasConnected.current) return;
    hasConnected.current = true;

    const token = localStorage.getItem("token");
    if (!token) {
      router.push(`/auth?redirect=/room/${encodeURIComponent(roomName)}`);
      return;
    }

    async function connectToRoom() {
      try {
        const res = await axios.get(
          `${API_BASE}/room/${encodeURIComponent(roomName)}`
        );
        const dbRoomId: number = res.data.room.roomId;

        await connectToWebSocket(dbRoomId);

        onWebSocketMessage((data: {
          type: string;
          userName?: string;
          userId?: string;
          sender?: string;
          message?: string;
          users?: { name: string }[];
        }) => {
          if (data.type === "room_users" && data.users) {
            const storedName = localStorage.getItem("userName") || "";
            setConnectedUsers(
              data.users.filter((u) => u.name !== storedName)
            );
          } else if (data.type === "user_joined" && data.userName) {
            setConnectedUsers((prev) => {
              if (prev.some((u) => u.name === data.userName)) return prev;
              return [...prev, { name: data.userName! }];
            });
            addToast(`${data.userName} joined the room`, "join");
          } else if (data.type === "user_left" && data.userName) {
            setConnectedUsers((prev) =>
              prev.filter((u) => u.name !== data.userName)
            );
            addToast(`${data.userName} left the room`, "leave");
          } else if (data.type === "chat") {
            console.log("[Room] Chat from", data.sender, ":", data.message);
          }
        });
      } catch (err: any) {
        console.error("[Room] Failed to connect:", err);
        const msg =
          err.response?.data?.message ||
          err.message ||
          "Failed to connect to room";
        setConnectionError(msg);
      }
    }

    connectToRoom();

    return () => {
      disconnectFromWebSocket();
    };
  }, [roomName, router, addToast]);

  // Keyboard shortcut handler
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    const tag = (e.target as HTMLElement).tagName;
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
    const toolId = shortcutMap[e.key];
    if (toolId) setActiveTool(toolId);
  }, []);

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  // ── Disconnect: leave room and go home ──
  const handleStopSession = () => {
    disconnectFromWebSocket();
    router.push("/");
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden">
      <Canvas zoom={zoom} onZoomChange={setZoom} activeTool={activeTool} />

      <HamburgerMenu />
      <MainToolbar activeTool={activeTool} onToolChange={setActiveTool} />
      <ActionButtons
        onShareClick={() => setIsShareOpen(true)}
        isInRoom
        userName={userName}
        isLoggedIn={!!userName}
      />
      <ZoomControls zoom={zoom} onZoomChange={setZoom} />

      {/* Connection error banner */}
      {connectionError && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-lg bg-red-500/90 text-white text-sm font-medium shadow-lg">
          {connectionError}
        </div>
      )}

      {/* Join/leave toast notifications */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      <ShareDialog
        isOpen={isShareOpen}
        onClose={() => setIsShareOpen(false)}
        userName={userName || "Anonymous"}
        onStopSession={handleStopSession}
        activeRoom={roomName}
        connectedUsers={connectedUsers}
      />
    </div>
  );
}