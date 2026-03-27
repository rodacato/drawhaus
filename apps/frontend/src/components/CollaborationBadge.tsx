interface CollaborationBadgeProps {
  canEdit: boolean;
  raisedHands: Set<string>;
  isHandRaised: boolean;
  onRaiseHand: () => void;
  onLowerHand: () => void;
}

/**
 * Collaboration badge for concurrent editing.
 * Shows raise-hand signaling only (lock UI removed).
 */
export function CollaborationBadge({
  canEdit,
  raisedHands,
  isHandRaised,
  onRaiseHand,
  onLowerHand,
}: CollaborationBadgeProps) {
  if (!canEdit) return null;

  const handCount = raisedHands.size;

  return (
    <div className="flex items-center gap-2">
      {handCount > 0 && !isHandRaised && (
        <div className="flex items-center gap-1 rounded-full bg-yellow-100 px-2 py-1 text-[10px] font-medium text-yellow-700 shadow-sm animate-pulse">
          <span aria-hidden>✋</span> {handCount}
        </div>
      )}
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
