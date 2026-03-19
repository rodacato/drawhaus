import { useEffect, useRef } from "react";

interface SidebarDrawerProps {
  open: boolean;
  onClose: () => void;
  width?: number;
  children: React.ReactNode;
}

/**
 * Inline drawer that pushes adjacent content (no overlay/backdrop).
 * Animates width from 0 → target. Used by BoardSidebar for panel content.
 */
export function SidebarDrawer({ open, onClose, width = 300, children }: SidebarDrawerProps) {
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      const target = e.target as HTMLElement;
      const sidebar = document.getElementById("board-sidebar");
      // Ignore clicks inside the sidebar or inside portals (modals/previews)
      if (sidebar && !sidebar.contains(target)) {
        if (target.closest("[data-portal]") || target.closest(".fixed.inset-0.z-50")) return;
        onClose();
      }
    }
    const timer = setTimeout(() => document.addEventListener("mousedown", handleClick), 0);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("mousedown", handleClick);
    };
  }, [open, onClose]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  return (
    <div
      ref={ref}
      className="relative z-20 h-full overflow-y-auto border-r border-gray-200 bg-white shadow-lg transition-[width] duration-200 ease-out"
      style={{ width: open ? width : 0 }}
    >
      <div className="p-4" style={{ width }}>
        {children}
      </div>
    </div>
  );
}
