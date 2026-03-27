import type { LockHolderInfo } from "@/lib/hooks/collaboration/types";

interface CollaborationBadgeProps {
  hasEditLock: boolean;
  lockHolder: LockHolderInfo | null;
  queuePosition: number;
  lockTimeRemaining: number | null;
  canEdit: boolean;
  onTryAcquire: () => void;
  raisedHands: Set<string>;
  isHandRaised: boolean;
  onRaiseHand: () => void;
  onLowerHand: () => void;
}

export function CollaborationBadge({
  hasEditLock,
  lockHolder,
  queuePosition,
  lockTimeRemaining,
  canEdit,
  onTryAcquire,
  raisedHands,
  isHandRaised,
  onRaiseHand,
  onLowerHand,
}: CollaborationBadgeProps) {
  if (!canEdit) return null;

  const handCount = raisedHands.size;

  // Self holds the lock — show countdown + raised hands indicator
  if (hasEditLock && lockTimeRemaining !== null) {
    const seconds = Math.ceil(lockTimeRemaining / 1000);
    const fraction = lockTimeRemaining / 2500;
    return (
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-medium text-emerald-700 shadow-sm">
          <span className="inline-block h-1.5 w-8 rounded-full bg-emerald-200 overflow-hidden">
            <span
              className="block h-full rounded-full bg-emerald-500 transition-all duration-100"
              style={{ width: `${fraction * 100}%` }}
            />
          </span>
          Editando · {seconds}s
        </div>
        {handCount > 0 && (
          <div className="flex items-center gap-1 rounded-full bg-yellow-100 px-2 py-1 text-[10px] font-medium text-yellow-700 shadow-sm animate-pulse">
            <span aria-hidden>✋</span> {handCount}
          </div>
        )}
      </div>
    );
  }

  // In queue — show position + option to raise hand
  if (queuePosition > 0 && lockHolder) {
    return (
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5 rounded-full bg-blue-100 px-2.5 py-1 text-[10px] font-medium text-blue-700 shadow-sm">
          <span className="flex h-2 w-2 rounded-full bg-blue-400 animate-pulse" />
          #{queuePosition} en cola · {lockHolder.userName} editando
        </div>
        <button
          onClick={isHandRaised ? onLowerHand : onRaiseHand}
          className={`flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-medium shadow-sm transition-colors ${
            isHandRaised
              ? "bg-yellow-200 text-yellow-800"
              : "bg-gray-100 text-gray-600 hover:bg-yellow-100 hover:text-yellow-700"
          }`}
          title={isHandRaised ? "Bajar mano" : "Levantar mano"}
          type="button"
        >
          <span aria-hidden>✋</span>
          {isHandRaised ? "Bajar" : "Mano"}
        </button>
      </div>
    );
  }

  // Someone else holds the lock, not in queue — clear CTA
  if (lockHolder && !hasEditLock) {
    return (
      <div className="flex items-center gap-2">
        <button
          onClick={onTryAcquire}
          className="flex items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-medium text-amber-700 shadow-sm hover:bg-amber-200 transition-colors cursor-pointer"
          type="button"
        >
          <span className="flex h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
          {lockHolder.userName} editando · <span className="underline">Pedir turno</span>
        </button>
        <button
          onClick={isHandRaised ? onLowerHand : onRaiseHand}
          className={`flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-medium shadow-sm transition-colors ${
            isHandRaised
              ? "bg-yellow-200 text-yellow-800"
              : "bg-gray-100 text-gray-600 hover:bg-yellow-100 hover:text-yellow-700"
          }`}
          title={isHandRaised ? "Bajar mano" : "Levantar mano (tengo una duda)"}
          type="button"
        >
          <span aria-hidden>✋</span>
          {isHandRaised ? "Bajar" : "Mano"}
        </button>
      </div>
    );
  }

  // No lock held — idle
  return null;
}
