import { ReactNode } from "react";

export default function BoardLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="h-screen w-screen overflow-hidden bg-surface">
      {children}
    </div>
  );
}
