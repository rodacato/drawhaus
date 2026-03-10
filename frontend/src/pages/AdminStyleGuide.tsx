import { ui } from "@/lib/ui";

const coreColors = [
  { name: "Accent Coral", var: "--color-accent-coral", hex: "#E95B2D" },
  { name: "Accent Yellow", var: "--color-accent-yellow", hex: "#FBBF24" },
  { name: "Primary Blue", var: "--color-primary", hex: "#0EA5E9" },
  { name: "Primary Hover", var: "--color-primary-hover", hex: "#0284c7" },
  { name: "Accent Orange", var: "--color-accent-orange", hex: "#F97316" },
  { name: "Dark Base", var: "--color-surface-dark", hex: "#111827" },
  { name: "Light Base", var: "--color-surface", hex: "#F8FAF3" },
];

const semanticColors = [
  { name: "Success", var: "--color-success", hex: "#10B981" },
  { name: "Warning", var: "--color-warning", hex: "#F59E0B" },
  { name: "Error", var: "--color-error", hex: "#EF4444" },
  { name: "Info", var: "--color-info", hex: "#3B87F6" },
  { name: "Danger", var: "--color-danger", hex: "#dc2626" },
];

const surfaceColors = [
  { name: "Surface", var: "--color-surface", hex: "#F8FAF3" },
  { name: "Surface Raised", var: "--color-surface-raised", hex: "#ffffff" },
  { name: "Surface Dark", var: "--color-surface-dark", hex: "#111827" },
  { name: "Border", var: "--color-border", hex: "#e2e8f0" },
];

const textColors = [
  { name: "Text Primary", var: "--color-text-primary", hex: "#0f172a" },
  { name: "Text Secondary", var: "--color-text-secondary", hex: "#475569" },
  { name: "Text Muted", var: "--color-text-muted", hex: "#94a3b8" },
];

const logos: { label: string; src: string; bg: "light" | "dark" }[] = [
  { label: "Icon (light bg)", src: "/branding/icon_light_bg.svg", bg: "light" },
  { label: "Icon (dark bg)", src: "/branding/icon_dark_bg.svg", bg: "dark" },
  { label: "Icon (transparent)", src: "/branding/icon_transparent.svg", bg: "dark" },
  { label: "Icon (transparent light)", src: "/branding/icon_transparent_light.svg", bg: "light" },
  { label: "Monochrome (light)", src: "/branding/icon_monochrome_light.svg", bg: "light" },
  { label: "Monochrome (dark)", src: "/branding/icon_monochrome_dark.svg", bg: "dark" },
  { label: "Horizontal (light)", src: "/branding/logo_horizontal_light.svg", bg: "light" },
  { label: "Horizontal (dark)", src: "/branding/logo_horizontal_dark.svg", bg: "dark" },
  { label: "Stacked (light)", src: "/branding/logo_stacked_light.svg", bg: "light" },
  { label: "Stacked (dark)", src: "/branding/logo_stacked_dark.svg", bg: "dark" },
  { label: "Wordmark (light)", src: "/branding/wordmark_only_light.svg", bg: "light" },
  { label: "Wordmark (dark)", src: "/branding/wordmark_only_dark.svg", bg: "dark" },
];

function ColorSwatch({ name, hex, cssVar }: { name: string; hex: string; cssVar: string }) {
  return (
    <div className="flex flex-col gap-2">
      <div
        className="h-20 w-full rounded-xl border border-border shadow-sm"
        style={{ backgroundColor: hex }}
      />
      <div>
        <p className="text-sm font-medium text-text-primary">{name}</p>
        <p className="font-[family-name:var(--font-family-mono)] text-xs text-text-muted">{hex}</p>
        <p className="font-[family-name:var(--font-family-mono)] text-xs text-text-muted">{cssVar}</p>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4">
      <h2 className={ui.h2}>{title}</h2>
      <div className={ui.card}>{children}</div>
    </section>
  );
}

export function AdminStyleGuide() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className={ui.h1}>Style Guide</h1>
        <p className={ui.subtitle}>Brand colors, typography, logos, and UI components.</p>
      </div>

      {/* Brand Descriptor */}
      <Section title="Brand">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <img src="/logo-icon.svg" alt="" className="h-10 w-10" />
            <span className="font-[family-name:var(--font-family-heading)] text-2xl font-semibold tracking-tight">
              Drawhaus
            </span>
          </div>
          <p className="text-sm text-text-secondary">Diagrams &amp; Whiteboards. <strong>Self-Hosted.</strong></p>
          <div className="space-y-2 rounded-lg bg-surface p-4">
            <p className="text-xs font-medium uppercase tracking-wider text-text-muted">Taglines</p>
            <blockquote className="border-l-2 border-primary pl-3 text-sm italic text-text-secondary">
              "Your whiteboard, on your server."
            </blockquote>
            <p className="text-sm text-text-muted">Diagram freely. Own your data.</p>
            <p className="text-sm text-text-muted">Draw. Connect. Self-host.</p>
          </div>
        </div>
      </Section>

      {/* Core Colors */}
      <Section title="Core Colors">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {coreColors.map((c) => (
            <ColorSwatch key={c.var} name={c.name} hex={c.hex} cssVar={c.var} />
          ))}
        </div>
      </Section>

      {/* Semantic Colors */}
      <Section title="Semantic Colors">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {semanticColors.map((c) => (
            <ColorSwatch key={c.var} name={c.name} hex={c.hex} cssVar={c.var} />
          ))}
        </div>
      </Section>

      {/* Surfaces & Text */}
      <Section title="Surfaces & Text">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {surfaceColors.map((c) => (
            <ColorSwatch key={c.var} name={c.name} hex={c.hex} cssVar={c.var} />
          ))}
        </div>
        <div className="mt-6 grid grid-cols-3 gap-4">
          {textColors.map((c) => (
            <div key={c.var} className="flex items-center gap-3">
              <div className="h-10 w-10 shrink-0 rounded-lg border border-border" style={{ backgroundColor: c.hex }} />
              <div>
                <p className="text-sm font-medium" style={{ color: c.hex }}>{c.name}</p>
                <p className="font-[family-name:var(--font-family-mono)] text-xs text-text-muted">{c.hex}</p>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* Typography */}
      <Section title="Typography">
        <div className="space-y-6">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-text-muted">Headings — Sora</p>
            <p className="mt-2 font-[family-name:var(--font-family-heading)] text-3xl font-semibold tracking-tight">
              The quick brown fox jumps
            </p>
            <p className="mt-1 font-[family-name:var(--font-family-heading)] text-xl font-semibold">
              ABCDEFGHIJKLMNOPQRSTUVWXYZ
            </p>
            <p className="mt-1 font-[family-name:var(--font-family-heading)] text-lg font-medium text-text-secondary">
              abcdefghijklmnopqrstuvwxyz 0123456789
            </p>
          </div>
          <hr className="border-border" />
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-text-muted">Body — Inter</p>
            <p className="mt-2 text-base">
              The quick brown fox jumps over the lazy dog. Drawhaus is a modern, self-hosted diagramming tool for teams who value data ownership.
            </p>
            <p className="mt-1 text-sm text-text-secondary">
              ABCDEFGHIJKLMNOPQRSTUVWXYZ abcdefghijklmnopqrstuvwxyz 0123456789
            </p>
          </div>
          <hr className="border-border" />
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-text-muted">Monospace — JetBrains Mono</p>
            <div className="mt-2 rounded-lg bg-surface-dark p-4">
              <code className="font-[family-name:var(--font-family-mono)] text-sm text-green-400">
                const draw = true;
              </code>
              <br />
              <code className="font-[family-name:var(--font-family-mono)] text-sm text-text-muted">
                ABCDEFGHIJKLMNOPQRSTUVWXYZ 0123456789
              </code>
            </div>
          </div>
        </div>
      </Section>

      {/* UI Components */}
      <Section title="UI Components">
        <div className="space-y-6">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-text-muted">Buttons</p>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <button className={`${ui.btn} ${ui.btnPrimary}`}>Primary</button>
              <button className={`${ui.btn} ${ui.btnSecondary}`}>Secondary</button>
              <button className={`${ui.btn} ${ui.btnDanger}`}>Danger</button>
              <button className={`${ui.btn} ${ui.btnPrimary}`} disabled>Disabled</button>
            </div>
          </div>
          <hr className="border-border" />
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-text-muted">Inputs</p>
            <div className="mt-3 max-w-sm space-y-3">
              <input className={ui.input} placeholder="Placeholder text" readOnly />
              <input className={ui.input} value="Filled input" readOnly />
            </div>
          </div>
          <hr className="border-border" />
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-text-muted">Badges & Alerts</p>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <span className={ui.badge}>Badge</span>
              <span className="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium text-white" style={{ backgroundColor: "#E95B2D" }}>Coral</span>
              <span className="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium text-white" style={{ backgroundColor: "#0EA5E9" }}>Blue</span>
              <span className="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium text-white" style={{ backgroundColor: "#F97316" }}>Orange</span>
            </div>
            <div className="mt-3 max-w-md space-y-2">
              <p className={ui.alertError}>This is an error alert.</p>
              <p className={ui.alertSuccess}>This is a success alert.</p>
            </div>
          </div>
          <hr className="border-border" />
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-text-muted">Card</p>
            <div className={`${ui.card} mt-3 max-w-sm`}>
              <p className="text-sm text-text-primary">This is a card component with rounded corners, border, and raised surface.</p>
            </div>
          </div>
          <hr className="border-border" />
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-text-muted">Empty State</p>
            <div className={`${ui.empty} mt-3`}>No items yet. Create your first diagram.</div>
          </div>
        </div>
      </Section>

      {/* Logos */}
      <Section title="Logo System">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {logos.map((logo) => (
            <div key={logo.src} className="space-y-2">
              <div
                className={`flex h-32 items-center justify-center rounded-xl border border-border p-4 ${
                  logo.bg === "dark" ? "bg-surface-dark" : "bg-surface"
                }`}
              >
                <img
                  src={logo.src}
                  alt={logo.label}
                  className="max-h-full max-w-full object-contain"
                />
              </div>
              <p className="text-xs text-text-muted">{logo.label}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* Color in Context */}
      <Section title="Colors in Context">
        <div className="space-y-4">
          <div className="overflow-hidden rounded-xl">
            <div className="flex h-14 items-center gap-3 bg-surface-dark px-6">
              <img src="/logo-icon.svg" alt="" className="h-7 w-7" />
              <span className="font-[family-name:var(--font-family-heading)] text-sm font-semibold text-white">
                Drawhaus
              </span>
              <span className="ml-auto text-xs text-text-muted">Dark header preview</span>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-3">
            <div className="flex h-24 items-end rounded-xl p-3" style={{ backgroundColor: "#E95B2D" }}>
              <span className="text-xs font-medium text-white">Coral</span>
            </div>
            <div className="flex h-24 items-end rounded-xl p-3" style={{ backgroundColor: "#FBBF24" }}>
              <span className="text-xs font-medium text-surface-dark">Yellow</span>
            </div>
            <div className="flex h-24 items-end rounded-xl p-3" style={{ backgroundColor: "#0EA5E9" }}>
              <span className="text-xs font-medium text-white">Blue</span>
            </div>
            <div className="flex h-24 items-end rounded-xl p-3" style={{ backgroundColor: "#F97316" }}>
              <span className="text-xs font-medium text-white">Orange</span>
            </div>
          </div>
          <div className="rounded-xl bg-surface-dark p-6">
            <p className="font-[family-name:var(--font-family-heading)] text-lg font-semibold text-white">
              Drawhaus
            </p>
            <p className="mt-1 text-sm text-gray-400">
              Diagrams &amp; Whiteboards. <strong className="text-white">Self-Hosted.</strong>
            </p>
          </div>
        </div>
      </Section>
    </div>
  );
}
