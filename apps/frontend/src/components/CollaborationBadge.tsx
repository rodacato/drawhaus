import type { LockHolderInfo } from "@/lib/hooks/collaboration/types";

interface CollaborationBadgeProps {
  hasEditLock: boolean;
  lockHolder: LockHolderInfo | null;
  queuePosition: number;
  lockTimeRemaining: number | null;
  canEdit: boolean;
  onTryAcquire: () => void;
}

export function CollaborationBadge({
  hasEditLock,
  lockHolder,
  queuePosition,
  lockTimeRemaining,
  canEdit,
  onTryAcquire,
}: CollaborationBadgeProps) {
  if (!canEdit) return null;

  // Self holds the lock — show countdown
  if (hasEditLock && lockTimeRemaining !== null) {
    const seconds = Math.ceil(lockTimeRemaining / 1000);
    const fraction = lockTimeRemaining / 2500;
    return (
      <div className="flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-medium text-emerald-700 shadow-sm">
        <span
          className="inline-block h-1.5 w-8 rounded-full bg-emerald-200 overflow-hidden"
        >
          <span
            className="block h-full rounded-full bg-emerald-500 transition-all duration-100"
            style={{ width: `${fraction * 100}%` }}
          />
        </span>
        Editando · {seconds}s
      </div>
    );
  }

  // In queue — show position
  if (queuePosition > 0 && lockHolder) {
    return (
      <button
        className="flex items-center gap-1.5 rounded-full bg-blue-100 px-2.5 py-1 text-[10px] font-medium text-blue-700 shadow-sm animate-pulse"
        title="En cola de espera"
        type="button"
      >
        <span className="flex h-2 w-2 rounded-full bg-blue-400" />
        #{queuePosition} en cola · {lockHolder.userName} editando
      </button>
    );
  }

  // Someone else holds the lock, not in queue
  if (lockHolder && !hasEditLock) {
    return (
      <button
        onClick={onTryAcquire}
        className="flex items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-medium text-amber-700 shadow-sm hover:bg-amber-200 transition-colors cursor-pointer"
        title="Click para pedir turno"
        type="button"
      >
        <span className="flex h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
        {lockHolder.userName} editando
      </button>
    );
  }

  // No lock held — idle
  return null;
}
