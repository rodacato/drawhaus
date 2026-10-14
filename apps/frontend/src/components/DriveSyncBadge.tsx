export type DriveSyncState = "idle" | "syncing" | "synced" | "error";

const BADGE_CLASSES: Record<Exclude<DriveSyncState, "idle">, string> = {
  synced: "bg-success/10 text-success",
  syncing: "bg-info/10 text-info",
  error: "bg-error/10 text-error",
};

export function syncLabel(state: Exclude<DriveSyncState, "idle">, error?: string | null): string {
  if (state === "synced") return "Drive synced";
  if (state === "syncing") return "Syncing to Drive...";
  return error ?? "Drive sync failed";
}

export function DriveSyncBadge({
  state,
  error,
}: {
  readonly state: DriveSyncState;
  readonly error?: string | null;
}) {
  if (state === "idle") return null;

  const className = `pointer-events-auto rounded-full px-2.5 py-1 text-xs font-medium shadow-sm ${BADGE_CLASSES[state]}`;
  const label = syncLabel(state, error);

  return (
    <div className={className}>
      <svg
        width="10"
        height="10"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="mr-1 inline-block"
      >
        <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" />
      </svg>
      {label}
    </div>
  );
}
