export function MaintenancePage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-surface px-4">
      <div className="max-w-md text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-warning/10">
          <svg className="h-8 w-8 text-warning" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h1 className="font-sora text-2xl font-bold text-text-primary">Under Maintenance</h1>
        <p className="mt-3 text-sm text-text-muted leading-relaxed">
          Drawhaus is temporarily unavailable while we perform scheduled maintenance.
          Please check back shortly.
        </p>
      </div>
    </div>
  );
}
