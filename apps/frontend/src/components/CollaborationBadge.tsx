interface CollaborationBadgeProps {
  readonly canEdit: boolean;
  readonly raisedHands: Set<string>;
  readonly isHandRaised: boolean;
  readonly onRaiseHand: () => void;
  readonly onLowerHand: () => void;
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
        <div className="flex items-center gap-1 rounded-full bg-warning/10 px-2 py-1 text-[10px] font-medium text-warning shadow-sm animate-pulse">
          <span aria-hidden>✋</span> {handCount}
        </div>
      )}
      <button
        onClick={isHandRaised ? onLowerHand : onRaiseHand}
        className={`flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-medium shadow-sm transition-colors ${
          isHandRaised
            ? "bg-warning/10 text-warning"
            : "bg-selection text-text-secondary hover:bg-warning/10 hover:text-warning"
        }`}
        title={isHandRaised ? "Lower hand" : "Raise hand"}
        type="button"
      >
        <span aria-hidden>✋</span>
        {isHandRaised ? "Lower" : "Hand"}
      </button>
    </div>
  );
}
