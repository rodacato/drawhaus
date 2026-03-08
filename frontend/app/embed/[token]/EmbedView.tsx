"use client";

import { ExcalidrawCanvas } from "@/components/ExcalidrawCanvas";

type EmbedViewProps = {
  elements: unknown[];
  appState: Record<string, unknown>;
};

export default function EmbedView({ elements, appState }: EmbedViewProps) {
  return (
    <div className="h-screen w-screen">
      <ExcalidrawCanvas
        initialData={{
          elements,
          appState: {
            ...appState,
            viewBackgroundColor: "#ffffff",
          },
        }}
        viewModeEnabled={true}
      />
    </div>
  );
}
