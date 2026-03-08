import type { ConnectionState } from "@/lib/types";

export function ConnectionBadge({
  connectionState,
  connectionError,
}: {
  connectionState: ConnectionState;
  connectionError: string | null;
}) {
  if (connectionState === "connected") return null;

  const className = `pointer-events-auto rounded-full px-2.5 py-1 text-[10px] font-medium shadow-sm ${
    connectionState === "error"
      ? "bg-red-100 text-red-700"
      : connectionState === "disconnected"
        ? "bg-amber-100 text-amber-700"
        : "bg-blue-100 text-blue-700"
  }`;

  const label =
    connectionState === "error"
      ? connectionError ?? "Connection error"
      : connectionState === "disconnected"
        ? "Reconnecting..."
        : "Connecting...";

  return <div className={className}>{label}</div>;
}
