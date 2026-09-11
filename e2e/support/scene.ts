import type { Page } from "@playwright/test";
import type { SceneElement } from "../fixtures/api";

type ExcalidrawDevHook = {
  h?: {
    elements?: SceneElement[];
    state?: {
      viewModeEnabled: boolean;
      scrollX: number;
      scrollY: number;
      zoom: { value: number };
    };
  };
};

// Excalidraw's development build (the one Vite serves) exposes the live scene on window.h.
export function liveSceneElements(page: Page): Promise<SceneElement[]> {
  return page.evaluate(() =>
    ((window as unknown as ExcalidrawDevHook).h?.elements ?? [])
      .filter((e) => !e.isDeleted)
      .map(({ id, type, x, y, width, height, version, text }) => ({
        id,
        type,
        x,
        y,
        width,
        height,
        version,
        text,
      })),
  );
}

export async function liveSceneIds(page: Page): Promise<string[]> {
  return (await liveSceneElements(page)).map((e) => e.id);
}

export function viewport(page: Page) {
  return page.evaluate(() => {
    const state = (window as unknown as ExcalidrawDevHook).h?.state;
    if (!state) throw new Error("Excalidraw state is not available");
    return { scrollX: state.scrollX, scrollY: state.scrollY, zoom: state.zoom.value };
  });
}
