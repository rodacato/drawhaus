const STEPS = ["Admin Account", "Instance Config", "Integrations"];

function stepBadgeClass(isDone: boolean, isActive: boolean): string {
  if (isDone) return "bg-primary text-white";
  if (isActive) return "border-2 border-primary text-primary";
  return "border border-border text-text-muted";
}

export function SetupProgress({ current }: { readonly current: number }) {
  return (
    <div className="flex items-center gap-2">
      {STEPS.map((label, i) => {
        const step = i + 1;
        const isActive = step === current;
        const isDone = step < current;
        return (
          <div key={step} className="flex items-center gap-2">
            {i > 0 && (
              <div className={`h-px w-6 ${isDone ? "bg-primary" : "bg-border"}`} />
            )}
            <div className="flex items-center gap-1.5">
              <div className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium ${stepBadgeClass(isDone, isActive)}`}>
                {isDone ? "\u2713" : step}
              </div>
              <span className={`text-xs ${isActive ? "font-medium text-text-primary" : "text-text-muted"}`}>
                {label}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
