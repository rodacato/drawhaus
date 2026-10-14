import { useEffect, useEffectEvent, useRef } from "react";
import { createPortal } from "react-dom";

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function Dialog({
  onClose,
  label,
  className = "",
  dismissible = true,
  children,
}: {
  readonly onClose: () => void;
  readonly label: string;
  readonly className?: string;
  readonly dismissible?: boolean;
  readonly children: React.ReactNode;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const dismiss = useEffectEvent(() => {
    if (dismissible) onClose();
  });

  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;
    const previous = document.activeElement as HTMLElement | null;
    if (!panel.contains(document.activeElement)) {
      (panel.querySelector<HTMLElement>(FOCUSABLE) ?? panel).focus();
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        dismiss();
        return;
      }
      if (event.key !== "Tab" || !panel) return;
      const items = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (items.length === 0) {
        event.preventDefault();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      previous?.focus?.();
    };
  }, []);

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={() => dismissible && onClose()}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        tabIndex={-1}
        className={`relative z-10 w-full ${className}`}
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}
