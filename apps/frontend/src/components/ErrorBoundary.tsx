import { ErrorBoundary as ReactErrorBoundary, type FallbackProps } from "react-error-boundary";
import type { ReactNode } from "react";

interface Props {
  readonly children: ReactNode;
  readonly FallbackComponent: React.ComponentType<FallbackProps>;
}

export function ErrorBoundary({ children, FallbackComponent }: Props) {
  return (
    <ReactErrorBoundary FallbackComponent={FallbackComponent}>
      {children}
    </ReactErrorBoundary>
  );
}
