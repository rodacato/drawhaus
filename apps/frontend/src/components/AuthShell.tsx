import { ThemeToggle } from "@/components/ThemeToggle";
import { ui } from "@/lib/ui";

export function AuthShell({
  children,
  narrow,
}: {
  readonly children: React.ReactNode;
  readonly narrow?: boolean;
}) {
  return (
    <div className="relative grid min-h-screen place-items-center overflow-hidden bg-surface px-4 py-8">
      <div className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-primary/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-accent-coral/10 blur-3xl" />
      <div className="fixed right-4 top-4 z-10">
        <ThemeToggle />
      </div>
      <section
        className={`${ui.card} relative w-full ${narrow ? "max-w-md" : "max-w-110"} space-y-6`}
      >
        {children}
      </section>
    </div>
  );
}
