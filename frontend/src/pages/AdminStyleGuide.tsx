import { ui } from "@/lib/ui";
import { useState } from "react";

const coreColors = [
  { name: "Accent Coral", var: "--color-accent-coral", hex: "#E95B2D", usage: "Brand accent, CTAs, hero elements" },
  { name: "Accent Yellow", var: "--color-accent-yellow", hex: "#FBBF24", usage: "Highlights, callouts (sparingly)" },
  { name: "Primary Blue", var: "--color-primary", hex: "#0EA5E9", usage: "Interactive: buttons, links, active states" },
  { name: "Primary Hover", var: "--color-primary-hover", hex: "#0284c7", usage: "Hover state for primary" },
  { name: "Accent Orange", var: "--color-accent-orange", hex: "#F97316", usage: "Badges, tags, attention elements" },
  { name: "Dark Base", var: "--color-surface-dark", hex: "#111827", usage: "Dark mode background" },
  { name: "Light Base", var: "--color-surface", hex: "#F8FAF3", usage: "Light mode background (warm off-white)" },
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
  { label: "Horizontal (light)", src: "/branding/logo_horizontal_light.svg", bg: "light" },
  { label: "Horizontal (dark)", src: "/branding/logo_horizontal_dark.svg", bg: "dark" },
  { label: "Stacked (light)", src: "/branding/logo_stacked_light.svg", bg: "light" },
  { label: "Stacked (dark)", src: "/branding/logo_stacked_dark.svg", bg: "dark" },
  { label: "Wordmark (light)", src: "/branding/wordmark_only_light.svg", bg: "light" },
  { label: "Wordmark (dark)", src: "/branding/wordmark_only_dark.svg", bg: "dark" },
];

function ColorSwatch({ name, hex, cssVar, usage }: { name: string; hex: string; cssVar: string; usage?: string }) {
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
        {usage && <p className="mt-0.5 text-xs text-text-secondary">{usage}</p>}
      </div>
    </div>
  );
}

function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4">
      <div>
        <h2 className={ui.h2}>{title}</h2>
        {description && <p className="mt-1 text-sm text-text-secondary">{description}</p>}
      </div>
      <div className={ui.card}>{children}</div>
    </section>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-xs font-medium uppercase tracking-wider text-text-muted">{children}</p>;
}

export function AdminStyleGuide() {
  const [activeTab, setActiveTab] = useState("open");
  const [toggleA, setToggleA] = useState(true);
  const [toggleB, setToggleB] = useState(false);

  return (
    <div className="space-y-8">
      <div>
        <h1 className={ui.h1}>Style Guide</h1>
        <p className={ui.subtitle}>Brand colors, typography, logos, and UI components.</p>
      </div>

      {/* Brand Descriptor */}
      <Section title="Brand" description="Core identity and messaging.">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <img src="/logo-icon.svg" alt="Drawhaus" className="h-10 w-10" />
            <span className="font-[family-name:var(--font-family-heading)] text-2xl font-semibold tracking-tight">
              Drawhaus
            </span>
          </div>
          <p className="text-sm text-text-secondary">Diagrams &amp; Whiteboards. <strong>Self-Hosted.</strong></p>
          <div className="space-y-2 rounded-lg bg-surface p-4">
            <SectionLabel>Taglines</SectionLabel>
            <blockquote className="border-l-2 border-primary pl-3 text-sm italic text-text-secondary">
              "Your whiteboard, on your server."
            </blockquote>
            <p className="text-sm text-text-muted">Diagram freely. Own your data.</p>
            <p className="text-sm text-text-muted">Draw. Connect. Self-host.</p>
          </div>
          <div className="space-y-2 rounded-lg bg-surface p-4">
            <SectionLabel>Tone of Voice</SectionLabel>
            <p className="text-sm text-text-secondary"><strong>Direct. Honest. Smart.</strong> Write like talking to a peer, not a customer.</p>
            <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-lg bg-error/10 px-3 py-2 text-error">"We're thrilled to introduce our new feature"</div>
              <div className="rounded-lg bg-success/10 px-3 py-2 text-success">"New: export to PNG and SVG"</div>
              <div className="rounded-lg bg-error/10 px-3 py-2 text-error">"Leverage our powerful platform"</div>
              <div className="rounded-lg bg-success/10 px-3 py-2 text-success">"Draw diagrams. Own your data."</div>
            </div>
          </div>
        </div>
      </Section>

      {/* Logo System — compact */}
      <Section title="Logo System" description="Available logo variants. Use the right variant for each context.">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {logos.map((logo) => (
            <div key={logo.src} className="space-y-2">
              <div
                className={`flex h-24 items-center justify-center rounded-xl border border-border p-4 ${
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
        <div className="mt-4 rounded-lg bg-surface p-4">
          <SectionLabel>Usage guidelines</SectionLabel>
          <div className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1 text-xs text-text-secondary">
            <p>Landing page hero &rarr; Horizontal logo</p>
            <p>App header / navbar &rarr; Horizontal (compact)</p>
            <p>GitHub / CLI / app icon &rarr; Icon</p>
            <p>Favicon &rarr; 32x32 PNG</p>
            <p>Social media avatars &rarr; Icon monochrome</p>
            <p>Email / documents &rarr; Stacked logo</p>
          </div>
        </div>
      </Section>

      {/* Core Colors */}
      <Section title="Core Colors" description="Primary brand palette with usage guidelines.">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {coreColors.map((c) => (
            <ColorSwatch key={c.var} name={c.name} hex={c.hex} cssVar={c.var} usage={c.usage} />
          ))}
        </div>
      </Section>

      {/* Semantic Colors */}
      <Section title="Semantic Colors" description="Feedback and state colors.">
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
      <Section title="Typography" description="Three-font system: Sora for headings, Inter for body, JetBrains Mono for code.">
        <div className="space-y-6">
          <div>
            <SectionLabel>Headings — Sora (600 SemiBold)</SectionLabel>
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
            <SectionLabel>Body — Inter (400 Regular)</SectionLabel>
            <p className="mt-2 text-base">
              The quick brown fox jumps over the lazy dog. Drawhaus is a modern, self-hosted diagramming tool for teams who value data ownership.
            </p>
            <p className="mt-1 text-sm text-text-secondary">
              ABCDEFGHIJKLMNOPQRSTUVWXYZ abcdefghijklmnopqrstuvwxyz 0123456789
            </p>
            <p className="mt-2 text-xs text-text-muted">Min body: 14px (web), 16px (mobile) &middot; Line-height: 1.5 body, 1.2 headings</p>
          </div>
          <hr className="border-border" />
          <div>
            <SectionLabel>Monospace — JetBrains Mono (400 Regular)</SectionLabel>
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
          <hr className="border-border" />
          <div>
            <SectionLabel>Type Scale</SectionLabel>
            <div className="mt-2 space-y-2">
              <p className="text-3xl font-semibold font-[family-name:var(--font-family-heading)] tracking-tight">H1 — 30px / 1.2</p>
              <p className="text-xl font-semibold font-[family-name:var(--font-family-heading)]">H2 — 20px / 1.2</p>
              <p className="text-lg font-semibold font-[family-name:var(--font-family-heading)]">H3 — 18px / 1.3</p>
              <p className="text-base">Body — 16px / 1.5</p>
              <p className="text-sm text-text-secondary">Small — 14px / 1.5</p>
              <p className="text-xs text-text-muted">Caption — 12px / 1.5</p>
              <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted">LABEL — 10px / uppercase tracking-widest</p>
            </div>
          </div>
        </div>
      </Section>

      {/* Buttons */}
      <Section title="Buttons" description="Button variants from the ui utility. All buttons use rounded-lg, h-10, text-sm font-medium.">
        <div className="space-y-6">
          <div>
            <SectionLabel>Standard Variants</SectionLabel>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <button className={`${ui.btn} ${ui.btnPrimary}`}>Primary</button>
              <button className={`${ui.btn} ${ui.btnSecondary}`}>Secondary</button>
              <button className={`${ui.btn} ${ui.btnDanger}`}>Danger</button>
              <button className={`${ui.btn} ${ui.btnPrimary}`} disabled>Disabled</button>
            </div>
          </div>
          <hr className="border-border" />
          <div>
            <SectionLabel>CTA / Hero Buttons</SectionLabel>
            <p className="mt-1 text-xs text-text-muted">Larger buttons for landing pages and hero sections. Coral for primary CTA, Blue for secondary.</p>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <button className="inline-flex items-center gap-2 rounded-xl bg-accent-coral px-8 py-4 text-sm font-bold text-white shadow-xl shadow-accent-coral/25 transition-all hover:bg-accent-coral/90">
                Get Started
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" /></svg>
              </button>
              <button className="inline-flex items-center gap-2 rounded-xl bg-primary px-8 py-4 text-sm font-bold text-white shadow-xl shadow-primary/25 transition-all hover:bg-primary/90">
                Self-host now
              </button>
              <button className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface-raised px-8 py-4 text-sm font-bold text-text-primary transition-all hover:bg-surface">
                View Documentation
              </button>
            </div>
          </div>
          <hr className="border-border" />
          <div>
            <SectionLabel>Icon Buttons</SectionLabel>
            <p className="mt-1 text-xs text-text-muted">Square icon-only buttons for toolbars and actions.</p>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <button className="flex h-10 w-10 items-center justify-center rounded-lg bg-surface text-text-secondary transition-colors hover:bg-surface-raised hover:text-primary">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" /></svg>
              </button>
              <button className="flex h-10 w-10 items-center justify-center rounded-lg bg-surface text-text-secondary transition-colors hover:bg-surface-raised hover:text-primary">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
              </button>
              <button className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-white">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z" /></svg>
              </button>
            </div>
          </div>
          <hr className="border-border" />
          <div>
            <SectionLabel>Destructive / Outline</SectionLabel>
            <p className="mt-1 text-xs text-text-muted">Used in danger zones and destructive confirmations.</p>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <button className="inline-flex items-center justify-center rounded-lg border border-error px-6 py-2 text-sm font-semibold text-error transition-all hover:bg-error hover:text-white">
                Delete Account
              </button>
              <button className="inline-flex items-center justify-center rounded-lg bg-error/10 px-3 py-1.5 text-xs font-bold text-error transition-all hover:bg-error hover:text-white">
                Revoke
              </button>
            </div>
          </div>
        </div>
      </Section>

      {/* Form Elements */}
      <Section title="Form Elements" description="Inputs, selects, textareas, toggles, and labels.">
        <div className="space-y-6">
          <div>
            <SectionLabel>Text Inputs</SectionLabel>
            <div className="mt-3 max-w-md space-y-3">
              <label className={ui.label}>
                <span>Label</span>
                <input className={ui.input} placeholder="Placeholder text" readOnly />
              </label>
              <label className={ui.label}>
                <span>Filled Input</span>
                <input className={ui.input} value="john@drawhaus.io" readOnly />
              </label>
            </div>
          </div>
          <hr className="border-border" />
          <div>
            <SectionLabel>Input with Icon Prefix</SectionLabel>
            <p className="mt-1 text-xs text-text-muted">Used for search bars and special inputs across dashboard and editor.</p>
            <div className="mt-3 max-w-md">
              <div className="relative">
                <svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" /></svg>
                <input
                  className="block h-10 w-full rounded-lg border border-border bg-surface pl-10 pr-3 text-sm text-text-primary outline-none transition placeholder:text-text-muted focus:border-primary focus:ring-2 focus:ring-primary/25"
                  placeholder="Search diagrams, folders, or contributors..."
                  readOnly
                />
              </div>
            </div>
          </div>
          <hr className="border-border" />
          <div>
            <SectionLabel>Select / Dropdown</SectionLabel>
            <div className="mt-3 max-w-xs">
              <select className="block h-10 w-full appearance-none rounded-lg border border-border bg-surface px-3 pr-8 text-sm text-text-primary outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/25">
                <option>Viewer (Read-only)</option>
                <option>Editor (Full Access)</option>
                <option>Commenter</option>
              </select>
            </div>
          </div>
          <hr className="border-border" />
          <div>
            <SectionLabel>Textarea</SectionLabel>
            <p className="mt-1 text-xs text-text-muted">Used for comments and long-form input.</p>
            <div className="mt-3 max-w-md">
              <textarea
                className="block w-full resize-none rounded-lg border border-border bg-surface p-3 text-sm text-text-primary placeholder:text-text-muted outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/25"
                placeholder="Add a comment..."
                rows={3}
                readOnly
              />
            </div>
          </div>
          <hr className="border-border" />
          <div>
            <SectionLabel>Toggle Switches</SectionLabel>
            <p className="mt-1 text-xs text-text-muted">Used in settings for boolean options (Allow Registration, Maintenance Mode, etc.)</p>
            <div className="mt-3 space-y-4 max-w-md">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-text-primary">Allow Registration</p>
                  <p className="text-xs text-text-muted">Enable new users to sign up</p>
                </div>
                <button
                  onClick={() => setToggleA(!toggleA)}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors ${toggleA ? "bg-primary" : "bg-border"}`}
                >
                  <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform ${toggleA ? "translate-x-[22px]" : "translate-x-[2px]"} mt-[2px]`} />
                </button>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-text-primary">Maintenance Mode</p>
                  <p className="text-xs text-text-muted">Locks all diagram editing</p>
                </div>
                <button
                  onClick={() => setToggleB(!toggleB)}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors ${toggleB ? "bg-primary" : "bg-border"}`}
                >
                  <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform ${toggleB ? "translate-x-[22px]" : "translate-x-[2px]"} mt-[2px]`} />
                </button>
              </div>
            </div>
          </div>
          <hr className="border-border" />
          <div>
            <SectionLabel>Password Input with Toggle</SectionLabel>
            <div className="mt-3 max-w-md">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-sm font-medium text-text-secondary">Password</span>
                <a className="text-xs font-medium text-primary hover:underline" href="#">Forgot?</a>
              </div>
              <div className="relative">
                <input className={ui.input} placeholder="••••••••" type="password" readOnly />
                <button className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" /></svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </Section>

      {/* Badges & Tags */}
      <Section title="Badges & Tags" description="Role indicators, status pills, and category labels.">
        <div className="space-y-6">
          <div>
            <SectionLabel>Default Badge</SectionLabel>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <span className={ui.badge}>Badge</span>
            </div>
          </div>
          <hr className="border-border" />
          <div>
            <SectionLabel>Colored Accent Badges</SectionLabel>
            <p className="mt-1 text-xs text-text-muted">Used for brand color emphasis in hero sections and marketing.</p>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium text-white" style={{ backgroundColor: "#E95B2D" }}>Coral</span>
              <span className="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium text-white" style={{ backgroundColor: "#0EA5E9" }}>Blue</span>
              <span className="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium text-white" style={{ backgroundColor: "#F97316" }}>Orange</span>
              <span className="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium text-surface-dark" style={{ backgroundColor: "#FBBF24" }}>Yellow</span>
            </div>
          </div>
          <hr className="border-border" />
          <div>
            <SectionLabel>Role Badges</SectionLabel>
            <p className="mt-1 text-xs text-text-muted">Used in admin tables and user management.</p>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <span className="rounded bg-primary/10 px-2 py-1 text-[10px] font-bold uppercase tracking-tight text-primary">Admin</span>
              <span className="rounded bg-surface px-2 py-1 text-[10px] font-bold uppercase tracking-tight text-text-secondary">Editor</span>
              <span className="rounded bg-surface px-2 py-1 text-[10px] font-bold uppercase tracking-tight text-text-muted">Viewer</span>
            </div>
          </div>
          <hr className="border-border" />
          <div>
            <SectionLabel>Status Badges</SectionLabel>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <span className="rounded bg-primary/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary">Active</span>
              <span className="rounded bg-success/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-success">Online</span>
              <span className="rounded bg-warning/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-warning">Pending</span>
              <span className="rounded bg-surface px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-text-muted">Expires Oct 31</span>
            </div>
          </div>
          <hr className="border-border" />
          <div>
            <SectionLabel>Category Tags</SectionLabel>
            <p className="mt-1 text-xs text-text-muted">Small pill tags on diagram cards.</p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold uppercase text-primary">UX</span>
              <span className="rounded-full bg-surface px-1.5 py-0.5 text-[10px] font-bold uppercase text-text-secondary">Dev</span>
              <span className="rounded-full bg-surface px-1.5 py-0.5 text-[10px] font-bold uppercase text-text-secondary">Marketing</span>
            </div>
          </div>
        </div>
      </Section>

      {/* Alerts */}
      <Section title="Alerts & Feedback" description="Inline feedback messages.">
        <div className="space-y-3 max-w-lg">
          <p className={ui.alertError}>This is an error alert.</p>
          <p className={ui.alertSuccess}>This is a success alert.</p>
          <p className="rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 text-sm text-warning">This is a warning alert.</p>
          <p className="rounded-lg border border-info/30 bg-info/10 px-3 py-2 text-sm text-info">This is an info alert.</p>
        </div>
      </Section>

      {/* Cards & Panels */}
      <Section title="Cards & Panels" description="Container patterns used across the app.">
        <div className="space-y-6">
          <div>
            <SectionLabel>Standard Card</SectionLabel>
            <div className={`${ui.card} mt-3 max-w-sm`}>
              <p className="text-sm text-text-primary">This is a card component with rounded corners, border, and raised surface.</p>
            </div>
          </div>
          <hr className="border-border" />
          <div>
            <SectionLabel>Metric Card</SectionLabel>
            <p className="mt-1 text-xs text-text-muted">Used in the admin dashboard for KPI display.</p>
            <div className="mt-3 grid grid-cols-3 gap-4">
              <div className="relative overflow-hidden rounded-xl border border-border bg-surface-raised p-6 shadow-sm">
                <div className="absolute right-0 top-0 h-24 w-24 rounded-bl-full bg-primary/5" />
                <div className="relative flex flex-col gap-1">
                  <svg className="mb-2 h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" /></svg>
                  <p className="text-sm font-medium text-text-secondary">Total Users</p>
                  <div className="flex items-baseline gap-2">
                    <h3 className="text-3xl font-bold text-text-primary">1,284</h3>
                    <span className="text-sm font-bold text-success">+12%</span>
                  </div>
                </div>
              </div>
              <div className="relative overflow-hidden rounded-xl border border-border bg-surface-raised p-6 shadow-sm">
                <div className="absolute right-0 top-0 h-24 w-24 rounded-bl-full bg-primary/5" />
                <div className="relative flex flex-col gap-1">
                  <svg className="mb-2 h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6z" /></svg>
                  <p className="text-sm font-medium text-text-secondary">Total Diagrams</p>
                  <div className="flex items-baseline gap-2">
                    <h3 className="text-3xl font-bold text-text-primary">4,592</h3>
                    <span className="text-sm font-bold text-success">+5%</span>
                  </div>
                </div>
              </div>
              <div className="relative overflow-hidden rounded-xl border border-border bg-surface-raised p-6 shadow-sm">
                <div className="absolute right-0 top-0 h-24 w-24 rounded-bl-full bg-primary/5" />
                <div className="relative flex flex-col gap-1">
                  <svg className="mb-2 h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" /></svg>
                  <p className="text-sm font-medium text-text-secondary">Active Sessions</p>
                  <div className="flex items-baseline gap-2">
                    <h3 className="text-3xl font-bold text-text-primary">156</h3>
                    <span className="text-sm font-bold text-error">-2%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <hr className="border-border" />
          <div>
            <SectionLabel>Diagram Card</SectionLabel>
            <p className="mt-1 text-xs text-text-muted">Grid card with thumbnail, title, timestamp, and category tag.</p>
            <div className="mt-3 max-w-xs">
              <div className="group overflow-hidden rounded-xl border border-border bg-surface-raised transition-all hover:shadow-xl hover:border-primary/30">
                <div className="relative aspect-video bg-surface">
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent opacity-40 group-hover:opacity-60 transition-opacity" />
                  <div className="absolute inset-4 flex items-center justify-center rounded-lg border-2 border-dashed border-border">
                    <svg className="h-10 w-10 text-text-muted/30" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6z" /></svg>
                  </div>
                  <button className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-white/80 opacity-0 backdrop-blur transition-opacity group-hover:opacity-100 hover:text-primary">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 12.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 18.75a.75.75 0 110-1.5.75.75 0 010 1.5z" /></svg>
                  </button>
                </div>
                <div className="p-4">
                  <div className="flex items-start justify-between">
                    <h3 className="truncate pr-2 text-sm font-semibold text-text-primary">User Journey Map V2</h3>
                    <svg className="h-4 w-4 shrink-0 text-warning" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>
                  </div>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="text-xs text-text-muted">Edited 2 hours ago</span>
                    <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold uppercase text-primary">UX</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <hr className="border-border" />
          <div>
            <SectionLabel>Empty State</SectionLabel>
            <div className={`${ui.empty} mt-3`}>No items yet. Create your first diagram.</div>
          </div>
          <hr className="border-border" />
          <div>
            <SectionLabel>Danger Zone</SectionLabel>
            <p className="mt-1 text-xs text-text-muted">Used in settings for destructive actions.</p>
            <div className="mt-3 rounded-2xl border border-error/20 bg-error/5 p-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h3 className="font-bold text-error">Delete Account</h3>
                  <p className="text-sm text-text-muted">Once you delete your account, there is no going back.</p>
                </div>
                <button className="shrink-0 rounded-lg border border-error px-6 py-2 text-sm font-semibold text-error transition-all hover:bg-error hover:text-white">
                  Delete Account
                </button>
              </div>
            </div>
          </div>
        </div>
      </Section>

      {/* Navigation Patterns */}
      <Section title="Navigation" description="Sidebar, tabs, and nav item patterns used across the app.">
        <div className="space-y-6">
          <div>
            <SectionLabel>Sidebar Nav Items</SectionLabel>
            <p className="mt-1 text-xs text-text-muted">Active item uses primary/10 bg + primary text. Inactive uses hover:bg-surface.</p>
            <div className="mt-3 max-w-xs space-y-1">
              <a className="flex items-center gap-3 rounded-lg bg-primary/10 px-3 py-2.5 text-sm font-medium text-primary" href="#">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6z" /></svg>
                Dashboard
              </a>
              <a className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-text-secondary transition-colors hover:bg-surface" href="#">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" /></svg>
                User Management
              </a>
              <a className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-text-secondary transition-colors hover:bg-surface" href="#">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6a7.5 7.5 0 107.5 7.5h-7.5V6z" /><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 10.5H21A7.5 7.5 0 0013.5 3v7.5z" /></svg>
                Analytics
              </a>
              <div className="px-3 pb-1 pt-4 text-[10px] font-bold uppercase tracking-widest text-text-muted">Instance</div>
              <a className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-text-secondary transition-colors hover:bg-surface" href="#">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                Site Settings
              </a>
            </div>
          </div>
          <hr className="border-border" />
          <div>
            <SectionLabel>Tabs</SectionLabel>
            <p className="mt-1 text-xs text-text-muted">Used in comments panel, auth toggle, view switchers.</p>
            <div className="mt-3 max-w-sm">
              <div className="flex border-b border-border">
                {["open", "resolved", "all"].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`flex-1 py-3 text-sm font-semibold capitalize border-b-2 transition-colors ${
                      activeTab === tab
                        ? "border-primary text-primary"
                        : "border-transparent text-text-muted hover:text-text-primary"
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <hr className="border-border" />
          <div>
            <SectionLabel>View Toggle (Grid / List)</SectionLabel>
            <div className="mt-3">
              <div className="inline-flex items-center gap-1 rounded-lg border border-border bg-surface-raised p-1">
                <button className="rounded bg-surface p-1.5 text-primary">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" /></svg>
                </button>
                <button className="rounded p-1.5 text-text-muted transition-colors hover:bg-surface">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-.375 5.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" /></svg>
                </button>
              </div>
            </div>
          </div>
          <hr className="border-border" />
          <div>
            <SectionLabel>Pagination</SectionLabel>
            <div className="mt-3 flex items-center justify-between text-sm text-text-muted max-w-md">
              <p>Showing 1 to 3 of 1,284 users</p>
              <div className="flex gap-2">
                <button className="rounded-lg border border-border p-1.5 text-text-muted opacity-50" disabled>
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
                </button>
                <button className="rounded-lg border border-border p-1.5 text-text-muted transition-colors hover:bg-surface">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </Section>

      {/* Avatars */}
      <Section title="Avatars" description="User identity elements used in navbars, comments, and collaboration.">
        <div className="space-y-6">
          <div>
            <SectionLabel>Avatar Sizes</SectionLabel>
            <div className="mt-3 flex items-end gap-4">
              <div className="flex flex-col items-center gap-1">
                <div className="h-8 w-8 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold">AS</div>
                <span className="text-[10px] text-text-muted">32px</span>
              </div>
              <div className="flex flex-col items-center gap-1">
                <div className="h-10 w-10 rounded-full bg-primary/20 text-primary flex items-center justify-center text-sm font-bold">AS</div>
                <span className="text-[10px] text-text-muted">40px</span>
              </div>
              <div className="flex flex-col items-center gap-1">
                <div className="h-12 w-12 rounded-full border-2 border-primary bg-surface flex items-center justify-center text-sm font-bold text-primary">AS</div>
                <span className="text-[10px] text-text-muted">48px (bordered)</span>
              </div>
            </div>
          </div>
          <hr className="border-border" />
          <div>
            <SectionLabel>Stacked Avatars</SectionLabel>
            <p className="mt-1 text-xs text-text-muted">Used in collaboration headers to show active participants.</p>
            <div className="mt-3 flex items-center gap-3">
              <div className="flex -space-x-2">
                <div className="h-8 w-8 rounded-full border-2 border-surface-raised bg-primary/20 text-primary flex items-center justify-center text-xs font-bold">AR</div>
                <div className="h-8 w-8 rounded-full border-2 border-surface-raised bg-accent-coral/20 text-accent-coral flex items-center justify-center text-xs font-bold">SC</div>
                <div className="h-8 w-8 rounded-full border-2 border-surface-raised bg-surface text-text-muted flex items-center justify-center text-[10px] font-bold">+3</div>
              </div>
              <span className="text-sm text-text-muted">5 collaborators</span>
            </div>
          </div>
        </div>
      </Section>

      {/* Table */}
      <Section title="Table" description="Data table pattern used in admin panel.">
        <div className="overflow-hidden rounded-xl border border-border">
          <div className="flex items-center justify-between border-b border-border bg-surface/50 px-6 py-3">
            <h3 className="text-sm font-bold text-text-primary">User Management</h3>
            <div className="flex gap-2">
              <button className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium transition-colors hover:bg-surface">Export CSV</button>
              <button className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium transition-colors hover:bg-surface">Filters</button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-surface text-[10px] font-bold uppercase tracking-widest text-text-muted">
                <tr>
                  <th className="px-6 py-3">Name</th>
                  <th className="px-6 py-3">Email</th>
                  <th className="px-6 py-3">Role</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                <tr className="transition-colors hover:bg-surface/50">
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold">AS</div>
                      <span className="text-sm font-medium text-text-primary">Alex Smith</span>
                    </div>
                  </td>
                  <td className="px-6 py-3 text-sm text-text-muted">alex.smith@drawhaus.com</td>
                  <td className="px-6 py-3">
                    <span className="rounded bg-primary/10 px-2 py-1 text-[10px] font-bold uppercase tracking-tight text-primary">Admin</span>
                  </td>
                  <td className="px-6 py-3 text-right">
                    <button className="text-text-muted transition-colors hover:text-primary">
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 12a.75.75 0 11-1.5 0 .75.75 0 011.5 0zM12.75 12a.75.75 0 11-1.5 0 .75.75 0 011.5 0zM18.75 12a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" /></svg>
                    </button>
                  </td>
                </tr>
                <tr className="transition-colors hover:bg-surface/50">
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-surface text-text-secondary flex items-center justify-center text-xs font-bold">JD</div>
                      <span className="text-sm font-medium text-text-primary">Jane Doe</span>
                    </div>
                  </td>
                  <td className="px-6 py-3 text-sm text-text-muted">jane.doe@example.com</td>
                  <td className="px-6 py-3">
                    <span className="rounded bg-surface px-2 py-1 text-[10px] font-bold uppercase tracking-tight text-text-secondary">Editor</span>
                  </td>
                  <td className="px-6 py-3 text-right">
                    <button className="text-text-muted transition-colors hover:text-primary">
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 12a.75.75 0 11-1.5 0 .75.75 0 011.5 0zM12.75 12a.75.75 0 11-1.5 0 .75.75 0 011.5 0zM18.75 12a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" /></svg>
                    </button>
                  </td>
                </tr>
                <tr className="transition-colors hover:bg-surface/50">
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-surface text-text-secondary flex items-center justify-center text-xs font-bold">MK</div>
                      <span className="text-sm font-medium text-text-primary">Mike Knight</span>
                    </div>
                  </td>
                  <td className="px-6 py-3 text-sm text-text-muted">mike.k@drawhaus.io</td>
                  <td className="px-6 py-3">
                    <span className="rounded bg-surface px-2 py-1 text-[10px] font-bold uppercase tracking-tight text-text-muted">Viewer</span>
                  </td>
                  <td className="px-6 py-3 text-right">
                    <button className="text-text-muted transition-colors hover:text-primary">
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 12a.75.75 0 11-1.5 0 .75.75 0 011.5 0zM12.75 12a.75.75 0 11-1.5 0 .75.75 0 011.5 0zM18.75 12a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" /></svg>
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between border-t border-border px-6 py-3 text-sm text-text-muted">
            <p>Showing 1 to 3 of 1,284 users</p>
            <div className="flex gap-2">
              <button className="rounded-lg border border-border p-1.5 opacity-50" disabled>
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
              </button>
              <button className="rounded-lg border border-border p-1.5 transition-colors hover:bg-surface">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
              </button>
            </div>
          </div>
        </div>
      </Section>

      {/* Modal */}
      <Section title="Modal / Dialog" description="Modal container pattern used in share dialogs and confirmations.">
        <div className="space-y-4">
          <div className="overflow-hidden rounded-xl border border-border bg-surface-raised shadow-xl max-w-lg">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-primary/10 p-2">
                  <svg className="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z" /></svg>
                </div>
                <div>
                  <h2 className="text-sm font-bold text-text-primary">Share Diagram</h2>
                  <p className="text-xs text-text-muted">Manage access and collaboration links</p>
                </div>
              </div>
              <button className="text-text-muted transition-colors hover:text-text-primary">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            {/* Modal Body */}
            <div className="space-y-4 p-6">
              <div className="flex gap-2">
                <div className="flex-1 rounded-lg border border-border bg-surface px-4 py-2.5 text-xs text-text-muted truncate">
                  drawhaus.app/share/x9k2-p92m-q021-z92k
                </div>
                <button className={`${ui.btn} ${ui.btnPrimary} shrink-0`}>Copy Link</button>
              </div>
            </div>
            {/* Modal Footer */}
            <div className="flex justify-end gap-3 border-t border-border bg-surface/50 px-6 py-4">
              <button className={`${ui.btn} ${ui.btnSecondary}`}>Cancel</button>
              <button className={`${ui.btn} ${ui.btnPrimary}`}>Done</button>
            </div>
          </div>
        </div>
      </Section>

      {/* Context Menu */}
      <Section title="Context Menu / Dropdown" description="Floating menu for actions on cards and table rows.">
        <div className="max-w-xs">
          <div className="overflow-hidden rounded-xl border border-border bg-surface-raised py-2 shadow-2xl">
            <button className="flex w-full items-center gap-2 px-4 py-2 text-sm text-text-primary transition-colors hover:bg-surface">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z" /></svg>
              Share
            </button>
            <button className="flex w-full items-center gap-2 px-4 py-2 text-sm text-text-primary transition-colors hover:bg-surface">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 9.776c.112-.017.227-.026.344-.026h15.812c.117 0 .232.009.344.026m-16.5 0a2.25 2.25 0 00-1.883 2.542l.857 6a2.25 2.25 0 002.227 1.932H19.05a2.25 2.25 0 002.227-1.932l.857-6a2.25 2.25 0 00-1.883-2.542m-16.5 0V6A2.25 2.25 0 016 3.75h3.879a1.5 1.5 0 011.06.44l2.122 2.12a1.5 1.5 0 001.06.44H18A2.25 2.25 0 0120.25 9v.776" /></svg>
              Move
            </button>
            <button className="flex w-full items-center gap-2 px-4 py-2 text-sm text-primary transition-colors hover:bg-surface">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 011.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 00-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 01-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5a3.375 3.375 0 00-3.375-3.375H9.75" /></svg>
              Duplicate
            </button>
            <div className="my-1 border-t border-border" />
            <button className="flex w-full items-center gap-2 px-4 py-2 text-sm text-error transition-colors hover:bg-error/10">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>
              Delete
            </button>
          </div>
        </div>
      </Section>

      {/* Auth Card Pattern */}
      <Section title="Auth Card" description="Login/Register card pattern with toggle, social login, and form.">
        <div className="mx-auto max-w-[400px]">
          <div className="rounded-xl border border-border bg-surface-raised p-8 shadow-xl">
            {/* Toggle */}
            <div className="mb-6 flex rounded-lg bg-surface p-1">
              <button className="flex-1 rounded-lg bg-surface-raised py-2 text-sm font-semibold text-primary shadow-sm">Log in</button>
              <button className="flex-1 py-2 text-sm font-semibold text-text-muted transition-colors hover:text-text-primary">Create account</button>
            </div>
            {/* Social */}
            <div className="grid grid-cols-2 gap-3">
              <button className="flex items-center justify-center gap-2 rounded-lg border border-border py-2.5 text-sm font-medium transition-colors hover:bg-surface">Google</button>
              <button className="flex items-center justify-center gap-2 rounded-lg border border-border py-2.5 text-sm font-medium transition-colors hover:bg-surface">Apple</button>
            </div>
            {/* Divider */}
            <div className="relative my-6 flex items-center justify-center">
              <div className="w-full border-t border-border" />
              <span className="absolute bg-surface-raised px-4 text-xs font-medium uppercase tracking-widest text-text-muted">or</span>
            </div>
            {/* Form */}
            <div className="space-y-4">
              <label className={ui.label}>
                <span>Email Address</span>
                <input className={ui.input} placeholder="name@example.com" type="email" readOnly />
              </label>
              <label className={ui.label}>
                <span>Password</span>
                <input className={ui.input} placeholder="••••••••" type="password" readOnly />
              </label>
              <button className={`${ui.btn} ${ui.btnPrimary} w-full shadow-lg shadow-primary/20`}>
                Continue
              </button>
            </div>
          </div>
        </div>
      </Section>

      {/* Colors in Context */}
      <Section title="Colors in Context" description="How the palette works together in real layouts.">
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
          {/* Feature Card Preview */}
          <div>
            <SectionLabel>Feature Card (Landing Page)</SectionLabel>
            <div className="mt-3 grid grid-cols-2 gap-4 max-w-lg">
              <div className="rounded-2xl border border-border bg-surface-raised p-6 transition-all hover:border-primary/50 shadow-sm">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                  <svg className="h-6 w-6 text-primary" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" /></svg>
                </div>
                <h3 className="text-sm font-bold text-text-primary mb-1">Real-time collaboration</h3>
                <p className="text-xs text-text-secondary leading-relaxed">Work together in real-time. See cursors and changes instantly.</p>
              </div>
              <div className="rounded-2xl border border-border bg-surface-raised p-6 transition-all hover:border-accent-coral/50 shadow-sm">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-accent-coral/10">
                  <svg className="h-6 w-6 text-accent-coral" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" /></svg>
                </div>
                <h3 className="text-sm font-bold text-text-primary mb-1">Contextual comments</h3>
                <p className="text-xs text-text-secondary leading-relaxed">Leave feedback exactly where it belongs on the canvas.</p>
              </div>
            </div>
          </div>
        </div>
      </Section>
    </div>
  );
}
