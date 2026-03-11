type NewDiagramCardProps = {
  onClick: () => void;
  disabled?: boolean;
};

export function NewDiagramCard({ onClick, disabled }: NewDiagramCardProps) {
  return (
    <button onClick={onClick} disabled={disabled} className="flex min-h-[200px] flex-col items-center justify-center rounded-xl border-2 border-dashed border-border bg-surface-raised text-text-muted transition hover:border-primary hover:text-primary hover:shadow-xl" type="button">
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
      <span className="mt-2 text-sm font-medium">New Diagram</span>
    </button>
  );
}
