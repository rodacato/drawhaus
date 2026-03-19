import { useCallback, useState } from "react";

export type CanvasPrefs = {
  gridModeEnabled: boolean;
  gridSize: number;
  viewBackgroundColor: string;
};

const STORAGE_KEY = "drawhaus_canvas_prefs";

const DEFAULTS: CanvasPrefs = {
  gridModeEnabled: true,
  gridSize: 10,
  viewBackgroundColor: "#f8f9fc",
};

function load(): CanvasPrefs {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch { /* ignore */ }
  return { ...DEFAULTS };
}

export function useCanvasPrefs() {
  const [prefs, setPrefs] = useState<CanvasPrefs>(load);

  const updatePrefs = useCallback((patch: Partial<CanvasPrefs>) => {
    setPrefs((prev) => {
      const next = { ...prev, ...patch };
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch { /* quota */ }
      return next;
    });
  }, []);

  return { prefs, updatePrefs } as const;
}
