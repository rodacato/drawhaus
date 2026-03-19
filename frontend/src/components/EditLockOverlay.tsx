import { useCallback, useEffect, useRef, useState } from "react";

/** Transparent overlay that captures click intent when user doesn't have the lock */
export function LockOverlay({
  holderName,
  onTryAcquire,
}: {
  holderName: string;
  onTryAcquire: () => void;
}) {
  const [bubble, setBubble] = useState<{ x: number; y: number; show: boolean }>({ x: 0, y: 0, show: false });
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleClick = useCallback((e: React.MouseEvent) => {
    onTryAcquire();
    if (hideTimer.current) clearTimeout(hideTimer.current);
    setBubble({ x: e.clientX, y: e.clientY - 40, show: true });
    hideTimer.current = setTimeout(() => setBubble((b) => ({ ...b, show: false })), 2000);
  }, [onTryAcquire]);

  useEffect(() => {
    return () => { if (hideTimer.current) clearTimeout(hideTimer.current); };
  }, []);

  return (
    <div
      className="absolute inset-0 z-20 cursor-not-allowed"
      onClick={handleClick}
    >
      {bubble.show && (
        <div
          className="pointer-events-none fixed z-50 animate-in fade-in slide-in-from-bottom-2 duration-200"
          style={{ left: bubble.x, top: bubble.y, transform: "translate(-50%, -100%)" }}
        >
          <div className="flex items-center gap-2 rounded-full bg-gray-900/90 px-3.5 py-2 text-white shadow-lg backdrop-blur-sm">
            <span className="flex h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
            <span className="text-sm font-medium whitespace-nowrap">
              {holderName} está editando
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

/** Transient bubble that shows when lock holder changes */
export function EditingBubble({
  holderName,
  isSelf,
}: {
  holderName: string;
  isSelf: boolean;
}) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    setVisible(true);
    const timer = setTimeout(() => setVisible(false), 2500);
    return () => clearTimeout(timer);
  }, [holderName, isSelf]);

  if (!visible) return null;

  return (
    <div className="fixed top-14 left-1/2 z-40 -translate-x-1/2 animate-in fade-in slide-in-from-top-2 duration-300">
      <div className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium shadow-lg backdrop-blur-sm ${
        isSelf
          ? "bg-emerald-600/90 text-white"
          : "bg-gray-900/90 text-white"
      }`}>
        <span className={`flex h-2 w-2 rounded-full ${isSelf ? "bg-white" : "bg-amber-400"} animate-pulse`} />
        {isSelf ? "Tienes el control" : `${holderName} está editando`}
      </div>
    </div>
  );
}
