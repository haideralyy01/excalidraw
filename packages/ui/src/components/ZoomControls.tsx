"use client";

import React from "react";
import { ZoomOutIcon, ZoomInIcon, UndoIcon, RedoIcon } from "../icons/index";

export interface ZoomControlsProps {
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
          <ZoomOutIcon size={14} />
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
          <ZoomInIcon size={14} />
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
          <UndoIcon size={16} />
        </button>
        <button
          id="btn-redo"
          onClick={onRedo}
          className="flex items-center justify-center w-9 h-9 text-[#b4b4b4] hover:bg-[#2f2f35] transition-colors duration-150 cursor-pointer"
          aria-label="Redo"
        >
          <RedoIcon size={16} />
        </button>
      </div>
    </div>
  );
}
