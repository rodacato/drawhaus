import { Link, Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { ThemeToggle } from "@/components/ThemeToggle";
import pkg from "../../../../package.json";

const GITHUB_URL = "https://github.com/rodacato/drawhaus";
const EXCALIDRAW_URL = "https://excalidraw.com";
const EXCALIDRAW_GITHUB = "https://github.com/excalidraw/excalidraw";

const FEATURES = [
  {
    title: "Real-time collaboration",
    description: "Live cursors, presence indicators, and instant sync across all connected users.",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
  {
    title: "Workspaces",
    description: "Multi-tenant spaces with admin, editor, and viewer roles for teams and clients.",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="7" width="20" height="14" rx="2" ry="2" /><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
      </svg>
    ),
  },
  {
    title: "Developer templates",
    description: "7 built-in templates plus custom templates with categories and usage tracking.",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" /><line x1="3" y1="9" x2="21" y2="9" /><line x1="9" y1="21" x2="9" y2="9" />
      </svg>
    ),
  },
  {
    title: "Diagram as Code",
    description: "Paste Mermaid or PlantUML code and get editable Excalidraw elements on your canvas.",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" />
      </svg>
    ),
  },
  {
    title: "Google Drive sync",
    description: "Auto-backup diagrams to Google Drive on every save.",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" />
      </svg>
    ),
  },
  {
    title: "Multi-scene boards",
    description: "Tab bar with per-scene collaboration — organize complex diagrams into scenes.",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><line x1="7.5" y1="3" x2="7.5" y2="9" /><line x1="3" y1="9" x2="21" y2="9" />
      </svg>
    ),
  },
  {
    title: "Comments & threads",
    description: "Leave feedback directly on the canvas with threaded discussions and resolve workflow.",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    ),
  },
  {
    title: "Admin panel",
    description: "User management, instance metrics, settings, and automated database backups.",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </svg>
    ),
  },
  {
    title: "Export & share",
    description: "PNG, SVG exports. Embeddable links. Role-based sharing with expiration.",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
      </svg>
    ),
  },
  {
    title: "Security built-in",
    description: "AES-256 encrypted secrets, rate limiting, audit logging, and RBAC.",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
    ),
  },
  {
    title: "Folders & search",
    description: "Organize diagrams with folders. Full-text search across all titles.",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
      </svg>
    ),
  },
  {
    title: "Setup wizard",
    description: "3-step guided setup. No manual .env editing required.",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="9 11 12 14 22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
      </svg>
    ),
  },
];

const EXTRAS = [
  "Self-hosted deployment",
  "Workspaces & team roles",
  "Admin panel & metrics",
  "Developer templates",
  "Mermaid & PlantUML import",
  "Google Drive backup",
  "Threaded comments",
  "Auth & RBAC",
  "Folders & search",
  "Setup wizard",
];

function ScreenshotFrame({ src, alt }: { src: string; alt: string }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-border bg-surface-raised shadow-xl">
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        <div className="h-3 w-3 rounded-full bg-error/60" />
        <div className="h-3 w-3 rounded-full bg-warning/60" />
        <div className="h-3 w-3 rounded-full bg-success/60" />
        <span className="ml-2 text-xs text-text-muted">{alt}</span>
      </div>
      <img src={src} alt={alt} className="w-full" loading="lazy" />
    </div>
  );
}

function CheckIcon() {
  return (
    <svg className="mx-auto h-5 w-5 text-success" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}


export function LandingPage() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-surface">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen bg-surface text-text-primary">
      {/* Decorative blobs */}
      <div className="pointer-events-none absolute left-1/4 top-0 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-primary/10 blur-3xl" />
      <div className="pointer-events-none absolute right-0 top-40 h-[400px] w-[400px] rounded-full bg-primary/10 blur-3xl" />

      {/* Sticky nav */}
      <nav className="sticky top-0 z-50 border-b border-border/50 bg-surface/80 backdrop-blur-lg">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <img src="/logo-icon.svg" className="h-9 w-9" alt="Drawhaus" />
            <span className="font-sora text-xl font-semibold tracking-tight">Drawhaus</span>
          </div>

          <div className="hidden items-center gap-6 text-sm text-text-secondary sm:flex">
            <a href="#features" className="transition hover:text-text-primary">Features</a>
            <a href="#compare" className="transition hover:text-text-primary">What we add</a>
            <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer" className="transition hover:text-text-primary">GitHub</a>
          </div>

          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link to="/login" className="rounded-lg px-4 py-2 text-sm font-medium text-text-secondary transition hover:bg-surface-raised hover:text-text-primary">
              Sign In
            </Link>
            <Link to="/register" className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition hover:opacity-90">
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero section */}
      <section className="relative mx-auto max-w-6xl px-6 pb-24 pt-20">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div className="flex flex-col gap-6">
            <div className="flex w-fit items-center gap-2 rounded-full border border-border bg-surface-raised px-4 py-1.5 text-sm text-text-secondary">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
              </span>
              v{pkg.version} Now Available
            </div>

            <h1 className="font-sora text-4xl font-bold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
              Your whiteboard,{" "}
              <span className="bg-gradient-to-r from-primary to-info bg-clip-text text-transparent">
                on your server.
              </span>
            </h1>

            <p className="max-w-lg text-lg text-text-secondary">
              Real-time collaboration, developer templates, Mermaid &amp; PlantUML import — all self-hosted.
              Deploy in 5 minutes with Docker.
            </p>

            <div className="flex flex-wrap gap-3">
              <Link to="/register" className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-white transition hover:opacity-90">
                Get Started
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
                </svg>
              </Link>
              <a href={`${GITHUB_URL}#deploy`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-lg border border-border px-6 py-3 text-sm font-semibold text-text-secondary transition hover:bg-surface-raised hover:text-text-primary">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" /></svg>
                Deploy Your Own
              </a>
            </div>
          </div>

          {/* Hero screenshot */}
          <div className="relative">
            <div className="pointer-events-none absolute -inset-4 rounded-2xl bg-gradient-to-br from-primary/20 via-info/20 to-transparent blur-2xl" />
            <ScreenshotFrame src="/screenshots/hero-editor.png" alt="drawhaus — board" />
          </div>
        </div>
      </section>

      {/* Why Drawhaus — 3 value propositions */}
      <section className="mx-auto max-w-6xl px-6 py-24">
        <div className="mb-16 text-center">
          <h2 className="font-sora text-3xl font-bold tracking-tight sm:text-4xl">Why Drawhaus?</h2>
          <p className="mt-3 text-text-secondary">The features teams actually need, on infrastructure you control.</p>
        </div>

        {/* Section A: Control */}
        <div className="mb-20 grid items-center gap-12 lg:grid-cols-2">
          <ScreenshotFrame src="/screenshots/screenshot-admin.png" alt="drawhaus — admin" />
          <div>
            <h3 className="font-sora text-2xl font-bold">Full control over your data</h3>
            <p className="mt-3 text-text-secondary">
              Self-hosted on your infrastructure. Your diagrams never leave your server.
              AES-256 encrypted secrets, structured audit logging, and role-based access control.
            </p>
            <ul className="mt-4 space-y-2 text-sm text-text-secondary">
              <li className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-primary" />Docker deploy in minutes</li>
              <li className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-primary" />3-step setup wizard</li>
              <li className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-primary" />Automated database backups</li>
              <li className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-primary" />Rate limiting &amp; security headers</li>
            </ul>
          </div>
        </div>

        {/* Section B: Collaboration (reversed) */}
        <div className="mb-20 grid items-center gap-12 lg:grid-cols-2">
          <div className="order-2 lg:order-1">
            <h3 className="font-sora text-2xl font-bold">Built for teams</h3>
            <p className="mt-3 text-text-secondary">
              Real-time collaboration with live cursors, threaded comments, and workspaces
              for organizing by team or client.
            </p>
            <ul className="mt-4 space-y-2 text-sm text-text-secondary">
              <li className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-primary" />Workspaces with admin/editor/viewer roles</li>
              <li className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-primary" />Share links with role &amp; expiration</li>
              <li className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-primary" />Multi-scene boards</li>
              <li className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-primary" />Presence indicators &amp; viewport follow</li>
            </ul>
          </div>
          <div className="order-1 lg:order-2">
            <ScreenshotFrame src="/screenshots/screenshot-collab.png" alt="drawhaus — collaboration" />
          </div>
        </div>

        {/* Section C: Developer workflow */}
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div className="space-y-4">
            <ScreenshotFrame src="/screenshots/screenshot-code-import-plantuml.png" alt="drawhaus — PlantUML import" />
            <ScreenshotFrame src="/screenshots/screenshot-code-import-mermaid.png" alt="drawhaus — Mermaid import" />
          </div>
          <div>
            <h3 className="font-sora text-2xl font-bold">Developer-first workflow</h3>
            <p className="mt-3 text-text-secondary">
              Paste Mermaid or PlantUML code and get editable elements. Pick from built-in
              templates or save your own. Auto-backup to Google Drive.
            </p>
            <ul className="mt-4 space-y-2 text-sm text-text-secondary">
              <li className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-primary" />7 built-in developer templates</li>
              <li className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-primary" />Mermaid &amp; PlantUML diagram-as-code import</li>
              <li className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-primary" />Custom templates with categories</li>
              <li className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-primary" />Google Drive sync on save</li>
            </ul>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="bg-surface-raised/50 py-24">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <h2 className="font-sora text-3xl font-bold tracking-tight sm:text-4xl">
            Up and running in 5 minutes
          </h2>
          <p className="mt-3 text-text-secondary">From zero to whiteboarding with your team.</p>

          <div className="mt-16 grid gap-8 sm:grid-cols-3">
            {/* Step 1 */}
            <div className="flex flex-col items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-sm font-bold text-white">1</div>
              <div className="w-full overflow-hidden rounded-xl border border-border bg-[#1e1e2e] p-4 text-left">
                <code className="text-sm text-green-400">$ docker compose up -d</code>
              </div>
              <h4 className="font-sora font-semibold">Deploy</h4>
              <p className="text-sm text-text-secondary">One command. Docker handles the rest.</p>
            </div>

            {/* Step 2 */}
            <div className="flex flex-col items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-sm font-bold text-white">2</div>
              <div className="w-full overflow-hidden rounded-xl border border-border">
                <img src="/screenshots/screenshot-dashboard.png" alt="Setup wizard" className="w-full" loading="lazy" />
              </div>
              <h4 className="font-sora font-semibold">Configure</h4>
              <p className="text-sm text-text-secondary">Guided setup wizard. No .env editing.</p>
            </div>

            {/* Step 3 */}
            <div className="flex flex-col items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-sm font-bold text-white">3</div>
              <div className="w-full overflow-hidden rounded-xl border border-border">
                <img src="/screenshots/hero-editor.png" alt="Start drawing" className="w-full" loading="lazy" />
              </div>
              <h4 className="font-sora font-semibold">Create</h4>
              <p className="text-sm text-text-secondary">Start drawing with your team immediately.</p>
            </div>
          </div>

          <p className="mt-8 text-xs text-text-muted">
            Requirements: Docker 24+, 1GB RAM, PostgreSQL 15+
          </p>
        </div>
      </section>

      {/* Feature grid */}
      <section id="features" className="mx-auto max-w-6xl px-6 py-24">
        <div className="mb-12 text-center">
          <h2 className="font-sora text-3xl font-bold tracking-tight sm:text-4xl">
            Everything you need
          </h2>
          <p className="mt-3 text-text-secondary">
            Built for teams that take ownership of their tools.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {FEATURES.map((f) => (
            <div key={f.title} className="group rounded-xl border border-border bg-surface-raised p-6 transition hover:border-primary/30 hover:shadow-lg">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary transition group-hover:scale-110">
                {f.icon}
              </div>
              <h3 className="font-sora text-base font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm text-text-secondary">{f.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* What Drawhaus adds */}
      <section id="compare" className="bg-surface-raised/50 py-24">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <h2 className="font-sora text-3xl font-bold tracking-tight sm:text-4xl">
            Excalidraw, plus everything your team needs
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-text-secondary">
            Drawhaus is built on top of the amazing{" "}
            <a href={EXCALIDRAW_URL} target="_blank" rel="noopener noreferrer" className="font-medium text-primary hover:underline">Excalidraw</a>{" "}
            open-source editor. We added the features teams need to collaborate and stay organized.
          </p>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            {EXTRAS.map((extra) => (
              <span key={extra} className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-4 py-2 text-sm font-medium text-text-primary">
                <CheckIcon />
                {extra}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Tech stack */}
      <section className="mx-auto max-w-4xl px-6 py-16 text-center">
        <p className="mb-6 text-sm font-medium text-text-muted">Powered by battle-tested open source</p>
        <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-4 text-text-secondary">
          {["Docker", "PostgreSQL", "Excalidraw", "Socket.IO", "React", "TypeScript", "Vite"].map((tech) => (
            <span key={tech} className="text-sm font-medium">{tech}</span>
          ))}
        </div>
      </section>

      {/* CTA section */}
      <section className="mx-auto max-w-6xl px-6 py-16">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary to-info p-12 text-center text-white">
          <div className="pointer-events-none absolute -right-20 -top-20 h-60 w-60 rounded-full bg-white/10 blur-3xl" />
          <h2 className="font-sora text-3xl font-bold tracking-tight sm:text-4xl">
            Ready to take control?
          </h2>
          <p className="mx-auto mt-4 max-w-md text-white/80">
            Deploy Drawhaus on your own server in minutes. No vendor lock-in, no data concerns.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <a
              href={`${GITHUB_URL}#deploy`}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg bg-white px-6 py-3 text-sm font-semibold text-primary transition hover:opacity-90"
            >
              Deploy Your Own
            </a>
            <Link to="/register" className="rounded-lg border border-white/30 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10">
              Try It Now
            </Link>
          </div>
        </div>
      </section>

      {/* Excalidraw attribution */}
      <section className="mx-auto max-w-6xl px-6 py-8">
        <div className="flex flex-col items-center gap-3 rounded-xl border border-border bg-surface-raised px-6 py-8 text-center">
          <p className="text-sm text-text-muted">Powered by open source</p>
          <p className="max-w-md text-text-secondary">
            Drawhaus is built on top of{" "}
            <a href={EXCALIDRAW_URL} target="_blank" rel="noopener noreferrer" className="font-semibold text-primary hover:underline">
              Excalidraw
            </a>
            , the incredible open-source whiteboard. Huge thanks to the Excalidraw team and community.
          </p>
          <a
            href={EXCALIDRAW_GITHUB}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 inline-flex items-center gap-2 text-sm font-medium text-text-secondary transition hover:text-text-primary"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" /></svg>
            excalidraw/excalidraw
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-surface">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 px-6 py-10 sm:flex-row">
          <div className="flex items-center gap-2">
            <img src="/logo-icon.svg" className="h-6 w-6" alt="Drawhaus" />
            <span className="font-sora text-sm font-semibold">Drawhaus</span>
          </div>

          <div className="flex flex-wrap items-center gap-6 text-sm text-text-secondary">
            <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer" className="transition hover:text-text-primary">GitHub</a>
            <Link to="/privacy" className="transition hover:text-text-primary">Privacy</Link>
            <Link to="/terms" className="transition hover:text-text-primary">Terms</Link>
          </div>

          <p className="text-xs text-text-muted">
            &copy; {new Date().getFullYear()} Drawhaus. Self-hosted by you.
          </p>
        </div>
      </footer>
    </div>
  );
}
