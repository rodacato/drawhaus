import * as Sentry from "@sentry/react";
import { ErrorBoundary as ReactErrorBoundary, type FallbackProps } from "react-error-boundary";
import type { ErrorInfo, ReactNode } from "react";

interface Props {
  readonly children: ReactNode;
  readonly FallbackComponent: React.ComponentType<FallbackProps>;
  readonly resetKeys?: unknown[];
}

// A caught render error never reaches Sentry's global handlers, so report it here.
function reportToSentry(error: unknown, info: ErrorInfo) {
  Sentry.captureException(error, { contexts: { react: { componentStack: info.componentStack } } });
}

export function ErrorBoundary({ children, FallbackComponent, resetKeys }: Props) {
  return (
    <ReactErrorBoundary
      FallbackComponent={FallbackComponent}
      resetKeys={resetKeys}
      onError={reportToSentry}
    >
      {children}
    </ReactErrorBoundary>
  );
}
