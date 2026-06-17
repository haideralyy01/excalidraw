"use client";

import { useState, useEffect, useCallback, useRef, use } from "react";
import { useRouter } from "next/navigation";
import { Canvas } from "@repo/ui/components/Canvas";
import type { CanvasHandle } from "@repo/ui/components/Canvas";
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
  sendShapeAdd,
  sendShapeUpdate,
  sendShapeDelete,
  getSelfUserId,
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

  // ── Canvas ref for imperative shape sync ──
  const canvasRef = useRef<CanvasHandle>(null);

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
        // 1. Fetch the room's DB id from the slug
        const res = await axios.get(
          `${API_BASE}/room/${encodeURIComponent(roomName)}`
        );
        const dbRoomId: number = res.data.room.roomId;

        // 2. Connect to WS and join the room
        await connectToWebSocket(dbRoomId);

        // 3. Register WS message handler IMMEDIATELY (before any async work)
        //    This prevents missing user_joined events during the shapes fetch
        onWebSocketMessage((data: {
          type: string;
          userName?: string;
          userId?: string;
          sender?: string;
          message?: string;
          users?: { name: string }[];
        }) => {
          // ── Presence events ──
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

          } else if (data.type === "chat" && data.message) {
            // ── Shape events (encoded as chat messages) ──
            // Skip messages from self (we already have these shapes locally)
            if (data.sender === getSelfUserId()) return;

            try {
              const parsed = JSON.parse(data.message);
              if (parsed.action === "add" && parsed.shape && canvasRef.current) {
                canvasRef.current.addRemoteShape(parsed.shape);
              } else if (parsed.action === "update" && parsed.shape && canvasRef.current) {
                canvasRef.current.updateRemoteShape(parsed.shape);
              } else if (parsed.action === "delete" && parsed.shapeId && canvasRef.current) {
                canvasRef.current.deleteRemoteShape(parsed.shapeId);
              }
            } catch {
              // Regular chat message — not a shape
              console.log("[Room] Chat from", data.sender, ":", data.message);
            }
          }
        });

        // 4. Load existing shapes from DB (chat history)
        try {
          const chatsRes = await axios.get(`${API_BASE}/chats/${dbRoomId}`);
          const chats: { message: string; userId: string }[] =
            chatsRes.data.chats || [];

          // Chats come in desc order — reverse to replay chronologically
          const chronological = [...chats].reverse();

          // Replay shape operations to build current canvas state
          const shapesMap = new Map<string, object>();
          for (const chat of chronological) {
            try {
              const parsed = JSON.parse(chat.message);
              if (parsed.action === "add" && parsed.shape?.id) {
                shapesMap.set(parsed.shape.id, parsed.shape);
              } else if (parsed.action === "update" && parsed.shape?.id) {
                shapesMap.set(parsed.shape.id, parsed.shape);
              } else if (parsed.action === "delete" && parsed.shapeId) {
                shapesMap.delete(parsed.shapeId);
              }
            } catch {
              // Not a shape message — skip (regular chat text)
            }
          }

          const loadedShapes = Array.from(shapesMap.values());
          if (loadedShapes.length > 0 && canvasRef.current) {
            canvasRef.current.loadShapes(loadedShapes as any);
            console.log("[Room] Loaded", loadedShapes.length, "shapes from DB");
          }
        } catch (err) {
          console.warn("[Room] Could not load existing shapes:", err);
        }
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

  // ── Shape callbacks: send to WS when local user draws/updates/deletes ──
  const handleShapeAdded = useCallback((shape: any) => {
    sendShapeAdd(shape);
  }, []);

  const handleShapeUpdated = useCallback((shape: any) => {
    sendShapeUpdate(shape);
  }, []);

  const handleShapeDeleted = useCallback((shapeId: string) => {
    sendShapeDelete(shapeId);
  }, []);

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
      <Canvas
        ref={canvasRef}
        zoom={zoom}
        onZoomChange={setZoom}
        activeTool={activeTool}
        onShapeAdded={handleShapeAdded}
        onShapeUpdated={handleShapeUpdated}
        onShapeDeleted={handleShapeDeleted}
      />

      <HamburgerMenu />
      <MainToolbar activeTool={activeTool} onToolChange={setActiveTool} />
      <ActionButtons
        onShareClick={() => setIsShareOpen(true)}
        isInRoom
        activeUserCount={1 + connectedUsers.length}
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