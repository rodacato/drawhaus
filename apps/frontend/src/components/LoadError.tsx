import { ui } from "@/lib/ui";

export function LoadError({
  message,
  onRetry,
}: {
  readonly message: string;
  readonly onRetry: () => void;
}) {
  return (
    <div role="alert" className={`${ui.alertError} flex items-center justify-between gap-3`}>
      <span>{message}</span>
      <button
        type="button"
        onClick={onRetry}
        className={`${ui.btn} ${ui.btnSecondary} h-8! px-3! text-xs`}
      >
        Try again
      </button>
    </div>
  );
}
