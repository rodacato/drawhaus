"use client";

import dynamic from "next/dynamic";
import type { ComponentType } from "react";
import "@excalidraw/excalidraw/index.css";
import type { ExcalidrawApi } from "@/lib/types";

const Excalidraw = dynamic(
  async () => (await import("@excalidraw/excalidraw")).Excalidraw,
  { ssr: false }
);

export const ExcalidrawCanvas = Excalidraw as unknown as ComponentType<{
  excalidrawAPI?: (api: ExcalidrawApi) => void;
  initialData: {
    elements: unknown[];
    appState: Record<string, unknown>;
  };
  onChange?: (elements: readonly unknown[], appState: Record<string, unknown>) => void;
  viewModeEnabled?: boolean;
}>;
