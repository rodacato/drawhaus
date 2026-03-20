import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "default" | "danger";
}

interface ConfirmContextValue {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

const ConfirmContext = createContext<ConfirmContextValue | null>(null);

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<(ConfirmOptions & { resolve: (v: boolean) => void }) | null>(null);
  const confirmBtnRef = useRef<HTMLButtonElement>(null);

  const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setState({ ...options, resolve });
    });
  }, []);

  function handleConfirm() {
    state?.resolve(true);
    setState(null);
  }

  function handleCancel() {
    state?.resolve(false);
    setState(null);
  }

  // Focus confirm button on open
  useEffect(() => {
    if (state) {
      requestAnimationFrame(() => confirmBtnRef.current?.focus());
    }
  }, [state]);

  // Close on Escape
  useEffect(() => {
    if (!state) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") handleCancel();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [state]);

  const isDanger = state?.variant === "danger";

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      {state &&
        createPortal(
          <div className="fixed inset-0 z-[110] flex items-center justify-center" role="dialog" aria-modal="true">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleCancel} />
            <div className="relative z-10 w-full max-w-sm rounded-2xl border border-border bg-surface-raised p-6 shadow-2xl">
              <div className="mb-1 flex items-center gap-3">
                {isDanger && (
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-error/10">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-error">
                      <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                      <line x1="12" y1="9" x2="12" y2="13" />
                      <line x1="12" y1="17" x2="12.01" y2="17" />
                    </svg>
                  </div>
                )}
                <h2 className="text-lg font-semibold text-text-primary">{state.title}</h2>
              </div>
              <p className="mt-2 text-sm text-text-secondary">{state.message}</p>
              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="inline-flex h-10 items-center justify-center rounded-lg border border-border bg-surface-raised px-4 text-sm font-medium text-text-primary transition hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                >
                  {state.cancelLabel ?? "Cancel"}
                </button>
                <button
                  ref={confirmBtnRef}
                  type="button"
                  onClick={handleConfirm}
                  className={`inline-flex h-10 items-center justify-center rounded-lg px-4 text-sm font-semibold text-white shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${
                    isDanger
                      ? "bg-error hover:bg-error/80 focus-visible:ring-error/50"
                      : "bg-primary hover:bg-primary-hover focus-visible:ring-primary/50"
                  }`}
                >
                  {state.confirmLabel ?? "Confirm"}
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error("useConfirm must be used within ConfirmProvider");
  return ctx.confirm;
}
