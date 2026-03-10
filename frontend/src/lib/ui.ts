export const ui = {
  // Layout
  page: "min-h-screen px-4 py-8 sm:px-6 lg:px-8",
  center: "mx-auto w-full max-w-5xl",
  centerNarrow: "mx-auto w-full max-w-lg",

  // Cards / Panels
  card: "rounded-2xl border border-border bg-surface-raised p-6 shadow-sm",

  // Typography (headings use Sora via CSS base layer)
  h1: "text-2xl font-semibold tracking-tight text-text-primary",
  h2: "text-lg font-semibold text-text-primary",
  subtitle: "mt-1 text-sm text-text-secondary",
  muted: "text-sm text-text-muted",

  // Form
  label: "block space-y-1.5 text-sm font-medium text-text-secondary",
  input:
    "block h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm text-text-primary outline-none transition placeholder:text-text-muted focus:border-primary focus:ring-2 focus:ring-primary/25",

  // Buttons
  btn: "inline-flex items-center justify-center rounded-lg px-4 h-10 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  btnPrimary:
    "bg-primary text-white hover:bg-primary-hover shadow-sm",
  btnSecondary:
    "border border-border bg-surface-raised text-text-primary hover:bg-surface",
  btnDanger:
    "bg-danger text-white hover:bg-danger/90",

  // Feedback
  alertError:
    "rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700",
  alertSuccess:
    "rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700",
  badge:
    "inline-flex items-center rounded-full bg-surface px-3 py-1 text-xs font-medium text-text-secondary ring-1 ring-inset ring-border",

  // Lists / Empty
  empty:
    "rounded-xl border border-dashed border-border p-6 text-center text-sm text-text-muted",
} as const;
