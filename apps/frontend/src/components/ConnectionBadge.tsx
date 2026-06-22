import type { ConnectionState } from "@/lib/types";

const BADGE_CLASSES: Partial<Record<ConnectionState, string>> = {
  error: "bg-red-100 text-red-700",
  disconnected: "bg-amber-100 text-amber-700",
};
const DEFAULT_BADGE_CLASS = "bg-blue-100 text-blue-700";

function connectionLabel(state: ConnectionState, error: string | null): string {
  if (state === "error") return error ?? "Connection error";
  if (state === "disconnected") return "Reconnecting...";
  return "Connecting...";
}

export function ConnectionBadge({
  connectionState,
  connectionError,
}: {
  readonly connectionState: ConnectionState;
  readonly connectionError: string | null;
}) {
  if (connectionState === "connected") return null;

  const className = `pointer-events-auto rounded-full px-2.5 py-1 text-[10px] font-medium shadow-sm ${BADGE_CLASSES[connectionState] ?? DEFAULT_BADGE_CLASS}`;
  const label = connectionLabel(connectionState, connectionError);

  return <div className={className}>{label}</div>;
}
