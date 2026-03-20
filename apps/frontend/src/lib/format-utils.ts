export function isExpired(expiresAt?: string | null): boolean {
  if (!expiresAt) return false;
  return new Date(expiresAt) < new Date();
}

export function formatRelativeDate(dateStr: string): string {
  const now = new Date();
  const then = new Date(dateStr);
  const diffMs = now.getTime() - then.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 60) return `Created ${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `Created ${diffHours} hour${diffHours === 1 ? "" : "s"} ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `Created ${diffDays} day${diffDays === 1 ? "" : "s"} ago`;
}

export function formatSize(size?: string): string {
  if (!size) return "";
  const bytes = Number.parseInt(size, 10);
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export type DiagramFormat = "mermaid" | "plantuml";

export function detectDiagramFormat(code: string): DiagramFormat {
  const trimmed = code.trimStart();
  if (
    trimmed.startsWith("@startuml") ||
    trimmed.startsWith("@startactivity")
  ) {
    return "plantuml";
  }
  return "mermaid";
}
