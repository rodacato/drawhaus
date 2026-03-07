import { ui } from "@/lib/ui";

export default function Loading() {
  return (
    <div className="grid min-h-screen place-items-center bg-surface px-4 py-8">
      <div className={`${ui.card} ${ui.centerNarrow} space-y-3`}>
        <p className="text-sm text-text-secondary">Loading Drawhaus...</p>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface">
          <div className="h-full w-1/3 animate-pulse rounded-full bg-accent" />
        </div>
      </div>
    </div>
  );
}
