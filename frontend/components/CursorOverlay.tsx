"use client";

import type { CursorInfo } from "@/lib/types";

export function CursorOverlay({ cursors }: { cursors: Record<string, CursorInfo> }) {
  return (
    <div className="pointer-events-none fixed inset-0 z-10">
      {Object.entries(cursors).map(([userId, cursor]) => (
        <div
          key={userId}
          className="absolute"
          style={{ left: cursor.x, top: cursor.y }}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M0 0L6 14L8 8L14 6L0 0Z" fill="#6366f1" stroke="#fff" strokeWidth="1" />
          </svg>
          <span className="ml-3 -mt-1 inline-block rounded bg-indigo-500 px-1.5 py-0.5 text-[10px] font-medium text-white shadow-sm whitespace-nowrap">
            {cursor.name}
          </span>
        </div>
      ))}
    </div>
  );
}
