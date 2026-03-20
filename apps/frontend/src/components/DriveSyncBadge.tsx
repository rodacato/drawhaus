export type DriveSyncState = "idle" | "syncing" | "synced" | "error";

export function DriveSyncBadge({
  state,
  error,
}: {
  state: DriveSyncState;
  error?: string | null;
}) {
  if (state === "idle") return null;

  const className = `pointer-events-auto rounded-full px-2.5 py-1 text-[10px] font-medium shadow-sm ${
    state === "synced"
      ? "bg-green-100 text-green-700"
      : state === "syncing"
        ? "bg-blue-100 text-blue-700"
        : "bg-red-100 text-red-700"
  }`;

  const label =
    state === "synced"
      ? "Drive synced"
      : state === "syncing"
        ? "Syncing to Drive..."
        : error ?? "Drive sync failed";

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
