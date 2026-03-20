import { useEffect, lazy, Suspense } from "react";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

const AnimatedBackground = lazy(() =>
  import("@/components/AnimatedBackground").then((m) => ({ default: m.AnimatedBackground }))
);

const GITHUB_URL = "https://github.com/rodacato/drawhaus";

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
    title: "Diagram as Code",
    description: "Paste Mermaid or PlantUML code and get editable Excalidraw elements on your canvas.",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" />
      </svg>
    ),
  },
  {
    title: "Public REST API",
    description: "Programmatic CRUD for diagrams via /v1/ endpoints. API key auth, rate limiting, OpenAPI spec.",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 20V10" /><path d="M12 20V4" /><path d="M6 20v-6" />
      </svg>
    ),
  },
  {
    title: "MCP Server",
    description: "AI agents in Claude Code, Cursor, or VS Code create and manage diagrams via natural language.",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1.07A7 7 0 0 1 14 23h-4a7 7 0 0 1-6.93-4H2a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h1a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2z" />
        <circle cx="10" cy="16" r="1" /><circle cx="14" cy="16" r="1" />
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
    title: "Comments & threads",
    description: "Leave feedback directly on the canvas with threaded discussions and resolve workflow.",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
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
];

const FAQ_ITEMS = [
  {
    question: "Is Drawhaus free?",
    answer: "Yes, 100% free and open source under the MIT license. Self-host on your own server — no subscriptions, no usage limits, no data collection.",
  },
  {
    question: "How is this different from Excalidraw?",
    answer: "Same incredible editor. Drawhaus adds the infrastructure layer: user auth, workspaces with roles, persistent storage, share links, snapshots, admin panel, REST API, and MCP server for AI tools.",
  },
  {
    question: "Do I need Excalidraw+ to use this?",
    answer: "No. Drawhaus is fully standalone. It's built on Excalidraw's open-source editor — you don't need an Excalidraw+ subscription.",
  },
  {
    question: "How hard is it to deploy?",
    answer: "One command: docker compose up. A 3-step setup wizard guides you through creating your admin account and configuring integrations — no .env editing required.",
  },
  {
    question: "Can AI tools create diagrams?",
    answer: "Yes. The @drawhaus/mcp package lets Claude Code, Cursor, and VS Code create, read, update, and delete diagrams via natural language. AI-generated diagrams are fully editable in the editor.",
  },
  {
    question: "Is my data secure?",
    answer: "You own the server, you own the data. Drawhaus includes AES-256 encrypted secrets, role-based access control, rate limiting, security headers, and structured audit logging.",
  },
  {
    question: "Can I use it with my team?",
    answer: "Yes. Workspaces with admin/editor/viewer roles, real-time collaboration with live cursors, share links with expiration, threaded comments, and Google Drive backup.",
  },
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

function FAQItem({ question, answer }: { question: string; answer: string }) {
  return (
    <details className="group border-b border-border pb-4">
      <summary className="flex cursor-pointer items-center justify-between py-4 font-sora text-base font-semibold transition hover:text-primary">
        {question}
        <svg className="h-5 w-5 shrink-0 text-text-muted transition group-open:rotate-45" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </summary>
      <p className="pb-2 text-text-secondary">{answer}</p>
    </details>
  );
}

export function LandingPage() {
  const { user, loading } = useAuth();

  // Force light theme on marketing pages — no dark mode at all
  useEffect(() => {
    const html = document.documentElement;
    const previousTheme = html.classList.contains("dark") ? "dark" : "light";
    html.classList.remove("dark");
    html.classList.add("light");
    return () => {
      html.classList.remove("light");
      html.classList.add(previousTheme);
    };
  }, []);

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
    <div className="relative min-h-screen bg-surface text-text-primary">
      {/* Three.js animated background */}
      <Suspense fallback={null}>
        <AnimatedBackground />
      </Suspense>

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
            <a href="#faq" className="transition hover:text-text-primary">FAQ</a>
            <Link to="/self-host" className="transition hover:text-text-primary">Self-Host</Link>
            <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer" className="transition hover:text-text-primary">GitHub</a>
          </div>

          <div className="flex items-center gap-3">
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
              Free &amp; Open Source
            </div>

            <h1 className="font-sora text-4xl font-bold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
              Your whiteboard,{" "}
              <span className="bg-gradient-to-r from-primary to-info bg-clip-text text-transparent">
                on your server.
              </span>
            </h1>

            <p className="max-w-lg text-lg text-text-secondary">
              Self-hosted collaborative diagramming built on Excalidraw.
              Real-time collab, REST API, MCP for AI tools, diagram-as-code — all on your infrastructure.
            </p>

            <div className="flex flex-wrap gap-3">
              <Link to="/self-host" className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-white transition hover:opacity-90">
                Deploy Your Own
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
                </svg>
              </Link>
              <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-lg border border-border px-6 py-3 text-sm font-semibold text-text-secondary transition hover:bg-surface-raised hover:text-text-primary">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" /></svg>
                View on GitHub
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
              <li className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-primary" />Persistent snapshot versioning</li>
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
              Paste Mermaid or PlantUML code and get editable elements. Use the REST API or MCP server
              to create diagrams programmatically. AI agents draw for you.
            </p>
            <ul className="mt-4 space-y-2 text-sm text-text-secondary">
              <li className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-primary" />Mermaid &amp; PlantUML diagram-as-code import</li>
              <li className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-primary" />REST API with OpenAPI 3.1 spec</li>
              <li className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-primary" />MCP server for Claude Code, Cursor, VS Code</li>
              <li className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-primary" />Google Drive sync on save</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Feature grid */}
      <section id="features" className="bg-surface-raised/50 py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mb-12 text-center">
            <h2 className="font-sora text-3xl font-bold tracking-tight sm:text-4xl">
              Everything you need
            </h2>
            <p className="mt-3 text-text-secondary">
              Built for teams that take ownership of their tools.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((f) => (
              <div key={f.title} className="group rounded-xl border border-border bg-surface p-6 transition hover:border-primary/30 hover:shadow-lg">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary transition group-hover:scale-110">
                  {f.icon}
                </div>
                <h3 className="font-sora text-base font-semibold">{f.title}</h3>
                <p className="mt-2 text-sm text-text-secondary">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="mx-auto max-w-3xl px-6 py-24">
        <div className="mb-12 text-center">
          <h2 className="font-sora text-3xl font-bold tracking-tight sm:text-4xl">
            Frequently asked questions
          </h2>
        </div>
        <div>
          {FAQ_ITEMS.map((item) => (
            <FAQItem key={item.question} question={item.question} answer={item.answer} />
          ))}
        </div>
      </section>

      {/* Free & Open Source */}
      <section className="bg-surface-raised/50 py-24">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-success/30 bg-success/10 px-4 py-1.5 text-sm font-medium text-success">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            MIT License
          </div>
          <h2 className="font-sora text-3xl font-bold tracking-tight sm:text-4xl">
            Free &amp; Open Source. Forever.
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-text-secondary">
            No pricing tiers. No feature gates. No "contact sales".
            Self-host on your own server and use every feature without limits.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link to="/self-host" className="rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-white transition hover:opacity-90">
              Self-Host Guide
            </Link>
            <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer" className="rounded-lg border border-border px-6 py-3 text-sm font-semibold text-text-secondary transition hover:bg-surface hover:text-text-primary">
              View Source
            </a>
          </div>
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
            <Link to="/self-host" className="transition hover:text-text-primary">Self-Host</Link>
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
