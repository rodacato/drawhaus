import { useEffect } from "react";
import { Link } from "react-router-dom";
import { ThemeToggle } from "@/components/ThemeToggle";

const GITHUB_URL = "https://github.com/rodacato/drawhaus";

function CodeBlock({ children, title }: { children: string; title?: string }) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-[#1e1e2e]">
      {title && (
        <div className="border-b border-white/10 px-4 py-2 text-xs text-white/40">{title}</div>
      )}
      <pre className="overflow-x-auto p-4">
        <code className="text-sm text-green-400">{children}</code>
      </pre>
    </div>
  );
}

export function SelfHostPage() {
  // Force light theme on marketing pages
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

  return (
    <div className="min-h-screen bg-surface text-text-primary">
      {/* Nav */}
      <nav className="sticky top-0 z-50 border-b border-border/50 bg-surface/80 backdrop-blur-lg">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Link to="/" className="flex items-center gap-3">
            <img src="/logo-icon.svg" className="h-9 w-9" alt="Drawhaus" />
            <span className="font-sora text-xl font-semibold tracking-tight">Drawhaus</span>
          </Link>

          <div className="hidden items-center gap-6 text-sm text-text-secondary sm:flex">
            <Link to="/" className="transition hover:text-text-primary">Home</Link>
            <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer" className="transition hover:text-text-primary">GitHub</a>
          </div>

          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link to="/login" className="rounded-lg px-4 py-2 text-sm font-medium text-text-secondary transition hover:bg-surface-raised hover:text-text-primary">
              Sign In
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="mx-auto max-w-3xl px-6 pb-16 pt-20 text-center">
        <h1 className="font-sora text-4xl font-bold tracking-tight sm:text-5xl">
          Self-Host Drawhaus
        </h1>
        <p className="mx-auto mt-4 max-w-lg text-lg text-text-secondary">
          Deploy on your own server in minutes. Free, open source, no external dependencies required.
        </p>
      </section>

      {/* Requirements */}
      <section className="mx-auto max-w-3xl px-6 pb-16">
        <div className="rounded-xl border border-border bg-surface-raised p-6">
          <h3 className="font-sora text-sm font-semibold uppercase tracking-wide text-text-muted">Requirements</h3>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <div>
              <p className="font-semibold">Docker 24+</p>
              <p className="text-sm text-text-secondary">Docker Compose included</p>
            </div>
            <div>
              <p className="font-semibold">1 GB RAM</p>
              <p className="text-sm text-text-secondary">Minimum for all services</p>
            </div>
            <div>
              <p className="font-semibold">PostgreSQL 16+</p>
              <p className="text-sm text-text-secondary">Included in Docker Compose</p>
            </div>
          </div>
        </div>
      </section>

      {/* Local Development */}
      <section className="mx-auto max-w-3xl px-6 pb-20">
        <h2 className="font-sora text-2xl font-bold tracking-tight">Local Development</h2>
        <p className="mt-2 text-text-secondary">
          Get Drawhaus running locally with Docker Compose. Everything starts with one command.
        </p>

        <div className="mt-8 space-y-6">
          <div>
            <h3 className="mb-3 font-sora text-sm font-semibold uppercase tracking-wide text-text-muted">1. Clone and configure</h3>
            <CodeBlock>{`git clone ${GITHUB_URL}.git
cd drawhaus
cp .env.example .env`}</CodeBlock>
          </div>

          <div>
            <h3 className="mb-3 font-sora text-sm font-semibold uppercase tracking-wide text-text-muted">2. Start everything</h3>
            <CodeBlock>{`docker compose up`}</CodeBlock>
          </div>

          <div>
            <h3 className="mb-3 font-sora text-sm font-semibold uppercase tracking-wide text-text-muted">3. Open the app</h3>
            <div className="rounded-xl border border-border bg-surface-raised p-6">
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-text-secondary">Frontend</span>
                  <code className="rounded bg-surface px-2 py-1 text-primary">http://localhost:5173</code>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-text-secondary">Backend</span>
                  <code className="rounded bg-surface px-2 py-1 text-primary">http://localhost:4300</code>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-text-secondary">PostgreSQL</span>
                  <code className="rounded bg-surface px-2 py-1 text-primary">localhost:5643</code>
                </div>
              </div>
            </div>
          </div>

          <p className="text-sm text-text-secondary">
            The first time you open the app, a setup wizard guides you through creating your admin account — no <code className="rounded bg-surface-raised px-1.5 py-0.5 text-xs">.env</code> editing required.
          </p>
        </div>
      </section>

      {/* Production */}
      <section className="bg-surface-raised/50 py-20">
        <div className="mx-auto max-w-3xl px-6">
          <h2 className="font-sora text-2xl font-bold tracking-tight">Production Deployment</h2>
          <p className="mt-2 text-text-secondary">
            Drawhaus deploys to any VPS with Docker via Kamal. Both frontend (nginx) and backend (Express) run on the same server.
          </p>

          <div className="mt-8 space-y-6">
            <div>
              <h3 className="mb-3 font-sora text-sm font-semibold uppercase tracking-wide text-text-muted">Architecture</h3>
              <CodeBlock>{`yourdomain.com         api.yourdomain.com
      │                       │
      ▼                       ▼
┌───────────────────────────────────┐
│          Kamal Proxy              │
│    (routes by host header)        │
└──────┬──────────────┬─────────────┘
       │              │
  Nginx (SPA)    Express + Socket.IO
  :80                 :4000
                      │
                  PostgreSQL`}</CodeBlock>
            </div>

            <div>
              <h3 className="mb-3 font-sora text-sm font-semibold uppercase tracking-wide text-text-muted">Prerequisites</h3>
              <ul className="space-y-2 text-text-secondary">
                <li className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-primary" />A VPS or dedicated server with Docker installed</li>
                <li className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-primary" />A domain name pointed to your server</li>
                <li className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-primary" />A GitHub account (for container registry)</li>
              </ul>
            </div>

            <div>
              <h3 className="mb-3 font-sora text-sm font-semibold uppercase tracking-wide text-text-muted">Deploy</h3>
              <CodeBlock>{`# First-time setup
kamal setup -c config/deploy.backend.yml
kamal setup -c config/deploy.frontend.yml

# Subsequent deploys (automatic via GitHub Actions)
git push origin master:production`}</CodeBlock>
            </div>

            <div>
              <h3 className="mb-3 font-sora text-sm font-semibold uppercase tracking-wide text-text-muted">Essential environment variables</h3>
              <div className="overflow-x-auto rounded-xl border border-border bg-surface p-4">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-text-muted">
                      <th className="pb-3 pr-4 font-medium">Variable</th>
                      <th className="pb-3 font-medium">Description</th>
                    </tr>
                  </thead>
                  <tbody className="text-text-secondary">
                    <tr className="border-t border-border">
                      <td className="py-2.5 pr-4 font-mono text-xs text-primary">DATABASE_URL</td>
                      <td className="py-2.5">PostgreSQL connection string</td>
                    </tr>
                    <tr className="border-t border-border">
                      <td className="py-2.5 pr-4 font-mono text-xs text-primary">SESSION_SECRET</td>
                      <td className="py-2.5">Session cookie signing key</td>
                    </tr>
                    <tr className="border-t border-border">
                      <td className="py-2.5 pr-4 font-mono text-xs text-primary">FRONTEND_URL</td>
                      <td className="py-2.5">Your frontend URL (for CORS)</td>
                    </tr>
                    <tr className="border-t border-border">
                      <td className="py-2.5 pr-4 font-mono text-xs text-primary">ENCRYPTION_KEY</td>
                      <td className="py-2.5">32-byte hex key for secret encryption</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p className="mt-3 text-sm text-text-muted">
                Google OAuth, Resend email, and other integrations are optional — configure them from the admin panel after deployment.
              </p>
            </div>
          </div>

          <div className="mt-10 flex flex-wrap gap-4">
            <a
              href={`${GITHUB_URL}#deployment`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-white transition hover:opacity-90"
            >
              Full Deploy Guide
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
              </svg>
            </a>
            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg border border-border px-6 py-3 text-sm font-semibold text-text-secondary transition hover:bg-surface hover:text-text-primary"
            >
              View on GitHub
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-surface">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 px-6 py-10 sm:flex-row">
          <Link to="/" className="flex items-center gap-2">
            <img src="/logo-icon.svg" className="h-6 w-6" alt="Drawhaus" />
            <span className="font-sora text-sm font-semibold">Drawhaus</span>
          </Link>

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
