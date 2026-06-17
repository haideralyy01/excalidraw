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
  const [userName, setUserName] = useState("Anonymous");
  const [connectedUsers, setConnectedUsers] = useState<ConnectedUser[]>([]);
  const [connectionError, setConnectionError] = useState<string | null>(null);

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
    // Prevent double-connect in React strict mode
    if (hasConnected.current) return;
    hasConnected.current = true;

    const token = localStorage.getItem("token");
    if (!token) {
      // Not logged in — redirect to auth with return URL
      router.push(`/auth?redirect=/room/${encodeURIComponent(roomName)}`);
      return;
    }

    async function connectToRoom() {
      try {
        // 1. Fetch the room's DB id from the slug
        const res = await axios.get(
          `${API_BASE}/room/${encodeURIComponent(roomName)}`
        );
        const dbRoomId: number = res.data.room.roomId;

        // 2. Connect to WS server and join the room
        await connectToWebSocket(dbRoomId);

        // 3. Listen for incoming messages (presence + chat)
        onWebSocketMessage((data: {
          type: string;
          userName?: string;
          userId?: string;
          sender?: string;
          message?: string;
          users?: { name: string }[];
        }) => {
          if (data.type === "room_users" && data.users) {
            // Full user list received on join (excludes self — self is shown by ShareDialog)
            const storedName = localStorage.getItem("userName") || "";
            setConnectedUsers(
              data.users.filter((u) => u.name !== storedName)
            );
          } else if (data.type === "user_joined" && data.userName) {
            // A new user joined the room
            setConnectedUsers((prev) => {
              // Avoid duplicates
              if (prev.some((u) => u.name === data.userName)) return prev;
              return [...prev, { name: data.userName! }];
            });
          } else if (data.type === "user_left" && data.userName) {
            // A user left the room
            setConnectedUsers((prev) =>
              prev.filter((u) => u.name !== data.userName)
            );
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

    // Cleanup: disconnect when leaving the page
    return () => {
      disconnectFromWebSocket();
    };
  }, [roomName, router]);

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
      <ActionButtons onShareClick={() => setIsShareOpen(true)} isInRoom />
      <ZoomControls zoom={zoom} onZoomChange={setZoom} />

      {/* Connection error toast */}
      {connectionError && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-lg bg-red-500/90 text-white text-sm font-medium shadow-lg">
          {connectionError}
        </div>
      )}

      <ShareDialog
        isOpen={isShareOpen}
        onClose={() => setIsShareOpen(false)}
        userName={userName}
        onStopSession={handleStopSession}
        activeRoom={roomName}
        connectedUsers={connectedUsers}
      />
    </div>
  );
}