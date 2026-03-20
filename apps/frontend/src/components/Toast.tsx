import { createContext, useCallback, useContext, useState } from "react";
import { createPortal } from "react-dom";

type ToastType = "success" | "error" | "info";

interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  toast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

let nextId = 0;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((message: string, type: ToastType = "success") => {
    const id = ++nextId;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3000);
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      {toasts.length > 0 &&
        createPortal(
          <div className="pointer-events-none fixed inset-x-0 top-6 z-[100] flex flex-col items-center gap-3">
            {toasts.map((t) => (
              <div
                key={t.id}
                className={`pointer-events-auto flex items-center gap-3 rounded-2xl border bg-surface-raised px-5 py-3.5 text-sm font-medium shadow-xl backdrop-blur-sm transition-all duration-300 ${
                  t.type === "error"
                    ? "border-error/25 text-error"
                    : t.type === "info"
                      ? "border-primary/25 text-text-primary"
                      : "border-success/25 text-text-primary"
                }`}
              >
                {t.type === "success" && (
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-success/15">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-success"><polyline points="20 6 9 17 4 12" /></svg>
                  </div>
                )}
                {t.type === "error" && (
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-error/15">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-error"><circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" /></svg>
                  </div>
                )}
                {t.type === "info" && (
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/15">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-primary"><circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" /></svg>
                  </div>
                )}
                {t.message}
              </div>
            ))}
          </div>,
          document.body,
        )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx.toast;
}
