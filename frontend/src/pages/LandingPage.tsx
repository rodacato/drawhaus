import { Link, Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { ThemeToggle } from "@/components/ThemeToggle";
import pkg from "../../../package.json";

const GITHUB_URL = "https://github.com/rodacato/drawhaus";
const EXCALIDRAW_URL = "https://excalidraw.com";
const EXCALIDRAW_GITHUB = "https://github.com/excalidraw/excalidraw";

export function LandingPage() {
  const { user, loading } = useAuth();
  const { theme } = useTheme();

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
          <div className="flex items-center gap-2">
            <img src="/logo-icon.svg" className="h-7 w-7" alt="Drawhaus" />
            <span className="font-sora text-lg font-semibold tracking-tight">Drawhaus</span>
          </div>

          <div className="hidden items-center gap-6 md:flex">
            <a href="#features" className="text-sm text-text-secondary transition hover:text-text-primary">Features</a>
            <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer" className="text-sm text-text-secondary transition hover:text-text-primary">GitHub</a>
          </div>

          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link
              to="/login"
              className="rounded-lg px-4 py-2 text-sm font-medium text-text-secondary transition hover:bg-surface-raised hover:text-text-primary"
            >
              Sign In
            </Link>
            <Link
              to="/register"
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero section */}
      <section className="relative mx-auto max-w-6xl px-6 pb-24 pt-20">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          {/* Left column */}
          <div className="flex flex-col gap-6">
            {/* Version badge */}
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
              A self-hosted whiteboarding platform for teams who need full control
              over their data. Real-time collaboration, no cloud required.
            </p>

            {/* CTA buttons */}
            <div className="flex flex-wrap gap-3">
              <Link
                to="/register"
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-white transition hover:opacity-90"
              >
                Get Started
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </Link>
              <a
                href={GITHUB_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-lg border border-border px-6 py-3 text-sm font-semibold text-text-secondary transition hover:bg-surface-raised hover:text-text-primary"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" /></svg>
                View on GitHub
              </a>
            </div>
          </div>

          {/* Right column — screenshot placeholder */}
          <div className="relative">
            <div className="pointer-events-none absolute -inset-4 rounded-2xl bg-gradient-to-br from-primary/20 via-info/20 to-transparent blur-2xl" />
            <div className="relative overflow-hidden rounded-2xl border border-border bg-surface-raised shadow-xl">
              <div className="flex items-center gap-2 border-b border-border px-4 py-3">
                <div className="h-3 w-3 rounded-full bg-error/60" />
                <div className="h-3 w-3 rounded-full bg-warning/60" />
                <div className="h-3 w-3 rounded-full bg-success/60" />
                <span className="ml-2 text-xs text-text-muted">drawhaus — board</span>
              </div>
              <div className="flex h-64 items-center justify-center bg-surface p-8 sm:h-80">
                <div className="flex flex-col items-center gap-3 text-text-muted">
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                    <circle cx="8.5" cy="8.5" r="1.5" />
                    <polyline points="21 15 16 10 5 21" />
                  </svg>
                  <span className="text-sm">Feature screenshot</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features grid */}
      <section id="features" className="mx-auto max-w-6xl px-6 py-24">
        <div className="mb-12 text-center">
          <h2 className="font-sora text-3xl font-bold tracking-tight sm:text-4xl">
            Everything you need
          </h2>
          <p className="mt-3 text-text-secondary">
            Built for teams that take ownership of their tools.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {/* Real-time collaboration */}
          <div className="group rounded-xl border border-border bg-surface-raised p-6 transition hover:border-primary/30 hover:shadow-lg">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary transition group-hover:scale-110">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </div>
            <h3 className="font-sora text-base font-semibold">Real-time collaboration</h3>
            <p className="mt-2 text-sm text-text-secondary">
              Work together on the same board with live cursors, presence indicators, and instant sync.
            </p>
          </div>

          {/* Contextual comments */}
          <div className="group rounded-xl border border-border bg-surface-raised p-6 transition hover:border-primary/30 hover:shadow-lg">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary transition group-hover:scale-110">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            </div>
            <h3 className="font-sora text-base font-semibold">Contextual comments</h3>
            <p className="mt-2 text-sm text-text-secondary">
              Leave feedback directly on the canvas. Threaded discussions keep conversations organized.
            </p>
          </div>

          {/* Fully self-hosted */}
          <div className="group rounded-xl border border-border bg-surface-raised p-6 transition hover:border-primary/30 hover:shadow-lg">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary transition group-hover:scale-110">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="2" width="20" height="8" rx="2" ry="2" />
                <rect x="2" y="14" width="20" height="8" rx="2" ry="2" />
                <line x1="6" y1="6" x2="6.01" y2="6" />
                <line x1="6" y1="18" x2="6.01" y2="18" />
              </svg>
            </div>
            <h3 className="font-sora text-base font-semibold">Fully self-hosted</h3>
            <p className="mt-2 text-sm text-text-secondary">
              Your data never leaves your infrastructure. Deploy with Docker in minutes.
            </p>
          </div>

          {/* Easy export */}
          <div className="group rounded-xl border border-border bg-surface-raised p-6 transition hover:border-primary/30 hover:shadow-lg">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary transition group-hover:scale-110">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
            </div>
            <h3 className="font-sora text-base font-semibold">Easy export</h3>
            <p className="mt-2 text-sm text-text-secondary">
              Export boards as SVG, PNG, or PDF. Share read-only links with anyone, even outside your org.
            </p>
          </div>
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
            <Link
              to="/register"
              className="rounded-lg bg-white px-6 py-3 text-sm font-semibold text-primary transition hover:opacity-90"
            >
              Deploy Now
            </Link>
            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg border border-white/30 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              View on GitHub
            </a>
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
            <a href={EXCALIDRAW_URL} target="_blank" rel="noopener noreferrer" className="transition hover:text-text-primary">Excalidraw</a>
          </div>

          <p className="text-xs text-text-muted">
            &copy; {new Date().getFullYear()} Drawhaus. Self-hosted by you.
          </p>
        </div>
      </footer>
    </div>
  );
}
