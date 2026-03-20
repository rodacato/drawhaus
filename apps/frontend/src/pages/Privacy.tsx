import { Link } from "react-router-dom";

export function Privacy() {
  return (
    <div className="min-h-screen bg-surface text-text-primary">
      <nav className="border-b border-border/50 bg-surface/80 backdrop-blur-lg">
        <div className="mx-auto flex h-16 max-w-3xl items-center px-6">
          <Link to="/" className="flex items-center gap-2">
            <img src="/logo-icon.svg" className="h-7 w-7" alt="Drawhaus" />
            <span className="font-sora text-lg font-semibold tracking-tight">Drawhaus</span>
          </Link>
        </div>
      </nav>

      <main className="mx-auto max-w-3xl px-6 py-16">
        <h1 className="font-sora text-3xl font-bold tracking-tight">Privacy Policy</h1>
        <p className="mt-2 text-sm text-text-muted">Last updated: {new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" })}</p>

        <div className="mt-10 space-y-8 text-text-secondary leading-relaxed">
          <section>
            <h2 className="font-sora text-lg font-semibold text-text-primary">Self-Hosted Software</h2>
            <p className="mt-2">
              Drawhaus is open-source, self-hosted software. When you deploy Drawhaus on your own
              infrastructure, <strong className="text-text-primary">your data stays on your server</strong>. We (the Drawhaus
              project maintainers) do not collect, store, process, or have access to any data you
              create or store in your self-hosted instance.
            </p>
          </section>

          <section>
            <h2 className="font-sora text-lg font-semibold text-text-primary">What We Don't Collect</h2>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>No telemetry or analytics are sent to us</li>
              <li>No user data leaves your server</li>
              <li>No tracking cookies or third-party scripts</li>
              <li>No usage metrics are reported back</li>
            </ul>
          </section>

          <section>
            <h2 className="font-sora text-lg font-semibold text-text-primary">Your Responsibility</h2>
            <p className="mt-2">
              As the operator of your self-hosted instance, you are responsible for:
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>Securing your server and database</li>
              <li>Managing user accounts and access</li>
              <li>Complying with applicable privacy laws in your jurisdiction</li>
              <li>Backing up your data</li>
            </ul>
          </section>

          <section>
            <h2 className="font-sora text-lg font-semibold text-text-primary">Third-Party Dependencies</h2>
            <p className="mt-2">
              Drawhaus uses open-source libraries including{" "}
              <a href="https://excalidraw.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Excalidraw</a>.
              Font files are loaded from Google Fonts during page load. If this is a concern, you may
              self-host the fonts as well.
            </p>
          </section>

          <section>
            <h2 className="font-sora text-lg font-semibold text-text-primary">Contact</h2>
            <p className="mt-2">
              For questions about this policy or the project, please open an issue on{" "}
              <a href="https://github.com/rodacato/drawhaus" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">GitHub</a>.
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
