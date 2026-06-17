"use client";

import { useState, useEffect, useCallback, useRef } from "react";
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
import axios from "axios";

const API_BASE = "http://localhost:8000/api/v1";

export default function Home() {
  const router = useRouter();
  const [zoom, setZoom] = useState(100);
  const [activeTool, setActiveTool] = useState<ToolId>("cursor");
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [userName, setUserName] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const undoRef = useRef<(() => void) | null>(null);
  const redoRef = useRef<(() => void) | null>(null);

  // Load user name from localStorage
  useEffect(() => {
    const storedName = localStorage.getItem("userName");
    const token = localStorage.getItem("token");
    if (storedName && token) {
      setUserName(storedName);
      setIsLoggedIn(true);
    }
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

  // ── Create room: hit backend API, then navigate to room page ──
  const handleCreateRoom = async (roomName: string) => {
    try {
      const token = localStorage.getItem("token");
      await axios.post(
        `${API_BASE}/room`,
        { name: roomName },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      // Navigate to room page — WS connection happens there
      router.push(`/room/${encodeURIComponent(roomName)}`);
    } catch (err: any) {
      const msg = err.response?.data?.message || "Failed to create room";
      alert(msg);
    }
  };

  // ── Join room: verify it exists, then navigate to room page ──
  const handleJoinRoom = async (roomName: string) => {
    try {
      // Check if the room exists on the backend
      await axios.get(`${API_BASE}/room/${encodeURIComponent(roomName)}`);
      // Navigate to room page — WS connection happens there
      router.push(`/room/${encodeURIComponent(roomName)}`);
    } catch (err: any) {
      const status = err.response?.status;
      if (status === 404) {
        alert("Room not found. Check the room name and try again.");
      } else {
        alert(err.response?.data?.message || "Failed to join room");
      }
    }
  };

  // ── Disconnect (shouldn't normally happen from home page) ──
  const handleStopSession = () => {
    console.log("Session stopped");
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden">
      <Canvas zoom={zoom} onZoomChange={setZoom} activeTool={activeTool} />

      <HamburgerMenu />
      <MainToolbar activeTool={activeTool} onToolChange={setActiveTool} />
      <ActionButtons
        onShareClick={() => setIsShareOpen(true)}
        userName={userName}
        isLoggedIn={isLoggedIn}
        onLoginClick={() => router.push("/auth")}
      />
      <ZoomControls zoom={zoom} onZoomChange={setZoom} />

      <ShareDialog
        isOpen={isShareOpen}
        onClose={() => setIsShareOpen(false)}
        userName={userName}
        onCreateRoom={handleCreateRoom}
        onJoinRoom={handleJoinRoom}
        onStopSession={handleStopSession}
      />
    </div>
  );
}
