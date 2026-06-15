"use client";

import { useState } from "react";
import { Canvas } from "@repo/ui/components/Canvas";
import { HamburgerMenu, MainToolbar, ActionButtons, ZoomControls } from "@repo/ui/components/Navbar";

export default function Home() {
  const [zoom, setZoom] = useState(100);

  return (
    <div className="relative w-screen h-screen overflow-hidden">
      {/* Full-screen canvas surface */}
      <Canvas zoom={zoom} onZoomChange={setZoom} />

      {/* Floating navbar components rendered on top of the canvas */}
      <HamburgerMenu />
      <MainToolbar />
      <ActionButtons />
      <ZoomControls zoom={zoom} onZoomChange={setZoom} />
    </div>
  );
}
