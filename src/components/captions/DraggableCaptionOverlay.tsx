'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { CaptionPosition } from '@/types/timeline';
import { Move, CornerDownRight, Maximize2 } from 'lucide-react';

interface DraggableCaptionOverlayProps {
  position: CaptionPosition;
  onPositionChange: (pos: CaptionPosition) => void;
  containerWidth: number;
  containerHeight: number;
  children: React.ReactNode;
  enabled?: boolean;
}

export function DraggableCaptionOverlay({
  position,
  onPositionChange,
  containerWidth,
  containerHeight,
  children,
  enabled = true,
}: DraggableCaptionOverlayProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [snapGuides, setSnapGuides] = useState<{
    showVerticalCenter: boolean;
    showHorizontalCenter: boolean;
    showBottomSafe: boolean;
    showRightSafe: boolean;
  }>({
    showVerticalCenter: false,
    showHorizontalCenter: false,
    showBottomSafe: false,
    showRightSafe: false,
  });

  const boxRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef<{
    startX: number;
    startY: number;
    initialPosX: number;
    initialPosY: number;
  }>({ startX: 0, startY: 0, initialPosX: 50, initialPosY: 72 });

  const SNAP_THRESHOLD_PCT = 2.5; // Snap within 2.5%

  const handlePointerDown = (e: React.PointerEvent) => {
    if (!enabled) return;
    e.stopPropagation();
    setIsDragging(true);

    dragStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initialPosX: position.x,
      initialPosY: position.y,
    };

    const handlePointerMove = (moveEvent: PointerEvent) => {
      if (!containerWidth || !containerHeight) return;

      const deltaX = moveEvent.clientX - dragStartRef.current.startX;
      const deltaY = moveEvent.clientY - dragStartRef.current.startY;

      const deltaPctX = (deltaX / containerWidth) * 100;
      const deltaPctY = (deltaY / containerHeight) * 100;

      // Clamp strictly within preview canvas boundaries: X: 5%–95%, Y: 10%–85%
      let newX = Math.max(5, Math.min(95, dragStartRef.current.initialPosX + deltaPctX));
      let newY = Math.max(10, Math.min(85, dragStartRef.current.initialPosY + deltaPctY));

      const newSnapGuides = {
        showVerticalCenter: false,
        showHorizontalCenter: false,
        showBottomSafe: false,
        showRightSafe: false,
      };

      // 1. Center Vertical Snap (X: 50%)
      if (Math.abs(newX - 50) <= SNAP_THRESHOLD_PCT) {
        newX = 50;
        newSnapGuides.showVerticalCenter = true;
      }

      // 2. Center Horizontal Snap (Y: 50%)
      if (Math.abs(newY - 50) <= SNAP_THRESHOLD_PCT) {
        newY = 50;
        newSnapGuides.showHorizontalCenter = true;
      }

      // 3. TikTok / Reels Safe Zone Snapping (Y: 70% bottom safe zone)
      if (Math.abs(newY - 70) <= SNAP_THRESHOLD_PCT) {
        newY = 70;
        newSnapGuides.showBottomSafe = true;
      }

      // 4. Right side action icon margin snap (X: 50% vs X: 45%)
      if (Math.abs(newX - 45) <= SNAP_THRESHOLD_PCT) {
        newX = 45;
        newSnapGuides.showRightSafe = true;
      }

      setSnapGuides(newSnapGuides);
      onPositionChange({
        x: Number(newX.toFixed(1)),
        y: Number(newY.toFixed(1)),
      });
    };

    const handlePointerUp = () => {
      setIsDragging(false);
      setSnapGuides({
        showVerticalCenter: false,
        showHorizontalCenter: false,
        showBottomSafe: false,
        showRightSafe: false,
      });
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
  };

  return (
    <>
      {/* SNAP GUIDELINES OVERLAY */}
      {isDragging && (
        <div className="absolute inset-0 pointer-events-none z-30">
          {/* Safe-Zone Box (Top 10% to Bottom 85%) */}
          <div className="absolute left-2 right-2 top-[10%] bottom-[15%] border border-dashed border-zinc-500/40 rounded-lg pointer-events-none bg-zinc-950/10">
            <span className="absolute top-1 left-2 px-1.5 py-0.5 rounded bg-[#18181b] border border-[#27272a] text-zinc-300 font-mono text-[9px] font-bold tracking-wider">
              SAFE ZONE (10% - 85%)
            </span>
          </div>

          {/* Center Vertical Guide (X: 50%) */}
          {snapGuides.showVerticalCenter && (
            <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-0.5 border-l border-dashed border-zinc-400">
              <span className="absolute top-2 left-2 px-1.5 py-0.5 rounded bg-[#18181b] border border-[#27272a] text-zinc-300 font-mono text-[9px] font-bold">
                CENTER X (50%)
              </span>
            </div>
          )}

          {/* Center Horizontal Guide (Y: 50%) */}
          {snapGuides.showHorizontalCenter && (
            <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-0.5 border-t border-dashed border-zinc-400">
              <span className="absolute left-2 top-2 px-1.5 py-0.5 rounded bg-[#18181b] border border-[#27272a] text-zinc-300 font-mono text-[9px] font-bold">
                CENTER Y (50%)
              </span>
            </div>
          )}

          {/* Safe Zone Snap (Y: 70%) */}
          {snapGuides.showBottomSafe && (
            <div className="absolute left-0 right-0 top-[70%] -translate-y-1/2 h-0.5 border-t border-dashed border-zinc-400">
              <span className="absolute left-2 -top-5 px-1.5 py-0.5 rounded bg-[#18181b] border border-[#27272a] text-zinc-300 font-mono text-[9px] font-bold">
                SAFE SNAP (70%)
              </span>
            </div>
          )}
        </div>
      )}

      {/* DRAGGABLE BOUNDING BOX */}
      <div
        ref={boxRef}
        style={{
          left: `${position.x}%`,
          top: `${position.y}%`,
          transform: 'translate(-50%, -50%)',
        }}
        onPointerDown={handlePointerDown}
        className={`absolute z-20 transition-[box-shadow,border-color] duration-150 select-none ${
          enabled ? 'cursor-grab active:cursor-grabbing' : 'pointer-events-none'
        } ${
          isDragging
            ? 'ring-1 ring-zinc-400 ring-offset-2 ring-offset-black/70 rounded-xl'
            : 'group-hover/player:ring-1 group-hover/player:ring-white/20 rounded-xl'
        }`}
      >
        {/* Caption Child Content */}
        {children}

        {/* Transform Drag Handles & Coordinate Pill */}
        {enabled && (
          <div
            className={`absolute -top-7 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-[#18181b] border border-[#27272a] text-[9px] font-mono text-zinc-300 flex items-center gap-1 shadow-lg pointer-events-none transition-opacity ${
              isDragging ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
            }`}
          >
            <Move className="w-2.5 h-2.5 text-zinc-400" />
            <span>X:{position.x}% Y:{position.y}%</span>
          </div>
        )}
      </div>
    </>
  );
}
