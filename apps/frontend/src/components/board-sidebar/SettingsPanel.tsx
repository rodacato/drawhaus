import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import type { CanvasPrefs } from "@/lib/hooks/useCanvasPrefs";

const GRID_SIZES = [
  { label: "Pequeña", value: 10 },
  { label: "Mediana", value: 20 },
  { label: "Grande", value: 40 },
] as const;

const BG_PRESETS = [
  { label: "Blanco", color: "#ffffff" },
  { label: "Gris claro", color: "#f8f9fc" },
  { label: "Gris", color: "#e8eaed" },
  { label: "Crema", color: "#fef9ef" },
  { label: "Azul pálido", color: "#f0f4ff" },
] as const;

type Props = {
  userEmail: string;
  onDashboardClick: () => void;
  canvasPrefs: CanvasPrefs;
  onCanvasPrefsChange: (patch: Partial<CanvasPrefs>) => void;
};

export function SettingsPanel({ userEmail, onDashboardClick, canvasPrefs, onCanvasPrefsChange }: Props) {
  const { logout } = useAuth();
  const { gridModeEnabled, gridSize, viewBackgroundColor, objectsSnapModeEnabled } = canvasPrefs;

  return (
    <div className="space-y-5">
      {/* ── Canvas ── */}
      <section>
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">Canvas</h3>

        {/* Grid toggle */}
        <div className="flex items-center justify-between rounded-lg px-3 py-2.5">
          <span className="text-sm text-gray-700">Cuadrícula</span>
          <button
            type="button"
            role="switch"
            aria-checked={gridModeEnabled}
            onClick={() => onCanvasPrefsChange({ gridModeEnabled: !gridModeEnabled })}
            className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full transition-colors ${gridModeEnabled ? "bg-blue-600" : "bg-gray-300"}`}
          >
            <span className={`pointer-events-none inline-block h-4 w-4 translate-y-0.5 rounded-full bg-white shadow transition-transform ${gridModeEnabled ? "translate-x-4" : "translate-x-0.5"}`} />
          </button>
        </div>

        {/* Grid size */}
        {gridModeEnabled && (
          <div className="mt-1 flex gap-1.5 px-3">
            {GRID_SIZES.map((s) => (
              <button
                key={s.value}
                type="button"
                onClick={() => onCanvasPrefsChange({ gridSize: s.value })}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition ${gridSize === s.value ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
              >
                {s.label}
              </button>
            ))}
          </div>
        )}

        {/* Object snap toggle */}
        <div className="flex items-center justify-between rounded-lg px-3 py-2.5">
          <span className="text-sm text-gray-700">Ajuste a objetos</span>
          <button
            type="button"
            role="switch"
            aria-checked={objectsSnapModeEnabled}
            onClick={() => onCanvasPrefsChange({ objectsSnapModeEnabled: !objectsSnapModeEnabled })}
            className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full transition-colors ${objectsSnapModeEnabled ? "bg-blue-600" : "bg-gray-300"}`}
          >
            <span className={`pointer-events-none inline-block h-4 w-4 translate-y-0.5 rounded-full bg-white shadow transition-transform ${objectsSnapModeEnabled ? "translate-x-4" : "translate-x-0.5"}`} />
          </button>
        </div>

        {/* Background color */}
        <div className="mt-2 px-3">
          <p className="mb-2 text-sm text-gray-700">Color de fondo</p>
          <div className="flex flex-wrap gap-2">
            {BG_PRESETS.map((p) => (
              <button
                key={p.color}
                type="button"
                title={p.label}
                onClick={() => onCanvasPrefsChange({ viewBackgroundColor: p.color })}
                className={`h-7 w-7 rounded-md border-2 transition ${viewBackgroundColor === p.color ? "border-blue-500 ring-2 ring-blue-200" : "border-gray-200 hover:border-gray-400"}`}
                style={{ backgroundColor: p.color }}
              />
            ))}
            {/* Custom color picker */}
            <label
              title="Color personalizado"
              className={`relative flex h-7 w-7 cursor-pointer items-center justify-center rounded-md border-2 transition ${!BG_PRESETS.some((p) => p.color === viewBackgroundColor) ? "border-blue-500 ring-2 ring-blue-200" : "border-gray-200 hover:border-gray-400"}`}
              style={{ background: "conic-gradient(red, yellow, lime, aqua, blue, magenta, red)" }}
            >
              <input
                type="color"
                value={viewBackgroundColor}
                onChange={(e) => onCanvasPrefsChange({ viewBackgroundColor: e.target.value })}
                className="absolute inset-0 cursor-pointer opacity-0"
              />
            </label>
          </div>
        </div>
      </section>

      <div className="border-t border-gray-100" />

      {/* ── Account ── */}
      <section>
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">Account</h3>
        <div className="rounded-lg bg-gray-50 px-3 py-2.5">
          <p className="truncate text-sm font-medium text-gray-900">{userEmail}</p>
        </div>
        <button type="button" onClick={onDashboardClick} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-gray-700 transition hover:bg-gray-50">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /></svg>
          Dashboard
        </button>
        <Link to="/settings" className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-gray-700 transition hover:bg-gray-50">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
          Settings
        </Link>
        <div className="border-t border-gray-100 pt-2">
          <button onClick={() => logout()} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-red-600 transition hover:bg-red-50" type="button">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>
            Logout
          </button>
        </div>
      </section>
    </div>
  );
}
