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
  readonly userEmail: string;
  readonly onDashboardClick: () => void;
  readonly canvasPrefs: CanvasPrefs;
  readonly onCanvasPrefsChange: (patch: Partial<CanvasPrefs>) => void;
};

export function SettingsPanel({
  userEmail,
  onDashboardClick,
  canvasPrefs,
  onCanvasPrefsChange,
}: Props) {
  const { logout } = useAuth();
  const { gridModeEnabled, gridSize, viewBackgroundColor, objectsSnapModeEnabled } = canvasPrefs;

  return (
    <div className="space-y-5">
      {/* ── Canvas ── */}
      <section>
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-text-muted">
          Canvas
        </h3>

        {/* Grid toggle */}
        <div className="flex items-center justify-between rounded-lg px-3 py-2.5">
          <span className="text-sm text-text-secondary">Cuadrícula</span>
          <button
            type="button"
            role="switch"
            aria-checked={gridModeEnabled}
            onClick={() => onCanvasPrefsChange({ gridModeEnabled: !gridModeEnabled })}
            className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full transition-colors ${gridModeEnabled ? "bg-primary" : "bg-border-input"}`}
          >
            <span
              className={`pointer-events-none inline-block h-4 w-4 translate-y-0.5 rounded-full bg-white shadow transition-transform ${gridModeEnabled ? "translate-x-4" : "translate-x-0.5"}`}
            />
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
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition ${gridSize === s.value ? "bg-selection text-primary" : "bg-selection text-text-secondary hover:bg-border"}`}
              >
                {s.label}
              </button>
            ))}
          </div>
        )}

        {/* Object snap toggle */}
        <div className="flex items-center justify-between rounded-lg px-3 py-2.5">
          <span className="text-sm text-text-secondary">Ajuste a objetos</span>
          <button
            type="button"
            role="switch"
            aria-checked={objectsSnapModeEnabled}
            onClick={() => onCanvasPrefsChange({ objectsSnapModeEnabled: !objectsSnapModeEnabled })}
            className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full transition-colors ${objectsSnapModeEnabled ? "bg-primary" : "bg-border-input"}`}
          >
            <span
              className={`pointer-events-none inline-block h-4 w-4 translate-y-0.5 rounded-full bg-white shadow transition-transform ${objectsSnapModeEnabled ? "translate-x-4" : "translate-x-0.5"}`}
            />
          </button>
        </div>

        {/* Background color */}
        <div className="mt-2 px-3">
          <p className="mb-2 text-sm text-text-secondary">Color de fondo</p>
          <div className="flex flex-wrap gap-2">
            {BG_PRESETS.map((p) => (
              <button
                key={p.color}
                type="button"
                title={p.label}
                onClick={() => onCanvasPrefsChange({ viewBackgroundColor: p.color })}
                className={`h-7 w-7 rounded-md border-2 transition ${viewBackgroundColor === p.color ? "border-primary ring-2 ring-primary/30" : "border-border hover:border-border-input"}`}
                style={{ backgroundColor: p.color }}
              />
            ))}
            {/* Custom color picker */}
            <label
              title="Color personalizado"
              className={`relative flex h-7 w-7 cursor-pointer items-center justify-center rounded-md border-2 transition ${BG_PRESETS.some((p) => p.color === viewBackgroundColor) ? "border-border hover:border-border-input" : "border-primary ring-2 ring-primary/30"}`}
              style={{ background: "conic-gradient(red, yellow, lime, aqua, blue, magenta, red)" }}
            >
              <span className="sr-only">Custom background color</span>
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

      <div className="border-t border-border" />

      {/* ── Account ── */}
      <section>
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-text-muted">
          Account
        </h3>
        <div className="rounded-lg bg-selection px-3 py-2.5">
          <p className="truncate text-sm font-medium text-text-primary">{userEmail}</p>
        </div>
        <button
          type="button"
          onClick={onDashboardClick}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-text-secondary transition hover:bg-selection"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="3" y="3" width="7" height="7" />
            <rect x="14" y="3" width="7" height="7" />
            <rect x="14" y="14" width="7" height="7" />
            <rect x="3" y="14" width="7" height="7" />
          </svg>
          Dashboard
        </button>
        <Link
          to="/settings"
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-text-secondary transition hover:bg-selection"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
          Settings
        </Link>
        <div className="border-t border-border pt-2">
          <button
            onClick={() => logout()}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-red-600 transition hover:bg-red-50"
            type="button"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            Logout
          </button>
        </div>
      </section>
    </div>
  );
}
