function buttonStateClass(active: boolean | undefined, accent: boolean | undefined): string {
  if (active) return "bg-selection text-primary";
  if (accent) return "bg-primary text-on-primary hover:bg-primary";
  return "text-text-muted hover:bg-selection hover:text-text-secondary";
}

export function SidebarButton({
  icon,
  label,
  active,
  badge,
  accent,
  onClick,
}: {
  readonly icon: React.ReactNode;
  readonly label: string;
  readonly active?: boolean;
  readonly badge?: number;
  readonly accent?: boolean;
  readonly onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`group relative flex h-10 w-10 items-center justify-center rounded-lg transition-colors ${buttonStateClass(active, accent)}`}
      title={label}
      type="button"
    >
      {icon}
      {badge != null && badge > 0 && (
        <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold leading-none text-on-primary">
          {badge > 99 ? "99+" : badge}
        </span>
      )}
      {/* Tooltip */}
      <span className="pointer-events-none absolute left-full ml-3 whitespace-nowrap rounded-md bg-surface-dark px-2 py-1 text-xs font-medium text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
        {label}
      </span>
    </button>
  );
}
