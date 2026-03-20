export function SidebarButton({
  icon,
  label,
  active,
  badge,
  accent,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  badge?: number;
  accent?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`group relative flex h-10 w-10 items-center justify-center rounded-lg transition-colors ${
        active
          ? "bg-blue-100 text-blue-600"
          : accent
            ? "bg-blue-500 text-white hover:bg-blue-600"
            : "text-gray-500 hover:bg-gray-100 hover:text-gray-700"
      }`}
      title={label}
      type="button"
    >
      {icon}
      {badge != null && badge > 0 && (
        <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-blue-500 px-1 text-[10px] font-bold leading-none text-white">
          {badge > 99 ? "99+" : badge}
        </span>
      )}
      {/* Tooltip */}
      <span className="pointer-events-none absolute left-full ml-3 whitespace-nowrap rounded-md bg-gray-900 px-2 py-1 text-xs font-medium text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
        {label}
      </span>
    </button>
  );
}
