import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import type { CaptureUpdateActionType } from "@excalidraw/excalidraw/store";

export type ExcalidrawApi = ExcalidrawImperativeAPI;

type SceneUpdate = Parameters<ExcalidrawApi["updateScene"]>[0];

export type UntypedScene = {
  elements?: readonly unknown[];
  appState?: Record<string, unknown>;
};

// Type-only on purpose: importing the runtime constant would pull Excalidraw into the entry bundle.
const NEVER: CaptureUpdateActionType = "NEVER";
const IMMEDIATELY: CaptureUpdateActionType = "IMMEDIATELY";

function update(api: ExcalidrawApi, scene: UntypedScene, captureUpdate: CaptureUpdateActionType) {
  // Scenes arrive as JSON from the socket, REST or IndexedDB, so this is where they get typed.
  api.updateScene({ ...scene, captureUpdate } as unknown as SceneUpdate);
}

/**
 * Apply a scene that did not come from this user's hand: a collaborator's change, the server's
 * copy, a restore, a followed viewport. Excalidraw keeps such updates out of the undo stack only
 * when told so; otherwise the next local action captures them and undo reverts them.
 */
export function applyRemoteScene(api: ExcalidrawApi, scene: UntypedScene): void {
  update(api, scene, NEVER);
}

/** Apply a scene the user chose, as one undoable step. */
export function applyLocalScene(api: ExcalidrawApi, scene: UntypedScene): void {
  update(api, scene, IMMEDIATELY);
}
