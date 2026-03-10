import { Link } from "react-router-dom";

export function Terms() {
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
        <h1 className="font-sora text-3xl font-bold tracking-tight">Terms of Use</h1>
        <p className="mt-2 text-sm text-text-muted">Last updated: {new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" })}</p>

        <div className="mt-10 space-y-8 text-text-secondary leading-relaxed">
          <section>
            <h2 className="font-sora text-lg font-semibold text-text-primary">Open Source License</h2>
            <p className="mt-2">
              Drawhaus is open-source software. You are free to use, modify, and distribute it
              under the terms of its license. The source code is available on{" "}
              <a href="https://github.com/rodacato/drawhaus" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">GitHub</a>.
            </p>
          </section>

          <section>
            <h2 className="font-sora text-lg font-semibold text-text-primary">Use at Your Own Risk</h2>
            <p className="mt-2">
              This software is provided <strong className="text-text-primary">"as is"</strong>, without warranty of any kind,
              express or implied, including but not limited to the warranties of merchantability,
              fitness for a particular purpose, and noninfringement.
            </p>
            <p className="mt-2">
              In no event shall the authors or copyright holders be liable for any claim, damages,
              or other liability, whether in an action of contract, tort, or otherwise, arising
              from, out of, or in connection with the software or the use or other dealings in the software.
            </p>
          </section>

          <section>
            <h2 className="font-sora text-lg font-semibold text-text-primary">Self-Hosted Responsibility</h2>
            <p className="mt-2">
              When you deploy Drawhaus on your own infrastructure, you are solely responsible for:
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>Server security, uptime, and maintenance</li>
              <li>Data backups and disaster recovery</li>
              <li>User management and access control</li>
              <li>Compliance with laws and regulations applicable to your use case</li>
              <li>Any modifications you make to the source code</li>
            </ul>
          </section>

          <section>
            <h2 className="font-sora text-lg font-semibold text-text-primary">No Guarantees</h2>
            <p className="mt-2">
              We make no guarantees about the availability, reliability, or correctness of this
              software. Features may change, break, or be removed without notice. This is a
              community project maintained on a best-effort basis.
            </p>
          </section>

          <section>
            <h2 className="font-sora text-lg font-semibold text-text-primary">Third-Party Software</h2>
            <p className="mt-2">
              Drawhaus is built on top of{" "}
              <a href="https://excalidraw.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Excalidraw</a>{" "}
              and other open-source libraries, each with their own licenses and terms. Use of
              those components is subject to their respective licenses.
            </p>
          </section>

          <section>
            <h2 className="font-sora text-lg font-semibold text-text-primary">Contact</h2>
            <p className="mt-2">
              For questions, please open an issue on{" "}
              <a href="https://github.com/rodacato/drawhaus" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">GitHub</a>.
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
