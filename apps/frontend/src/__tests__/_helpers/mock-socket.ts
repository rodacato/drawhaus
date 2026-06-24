import { vi } from "vitest";

type Handler = (...args: unknown[]) => void;

export interface MockSocketManager {
  on: ReturnType<typeof vi.fn>;
  off: ReturnType<typeof vi.fn>;
  handlers: Map<string, Set<Handler>>;
}

export interface MockSocket {
  id: string;
  connected: boolean;
  emit: ReturnType<typeof vi.fn>;
  on: ReturnType<typeof vi.fn>;
  off: ReturnType<typeof vi.fn>;
  disconnect: ReturnType<typeof vi.fn>;
  io: MockSocketManager;
  handlers: Map<string, Set<Handler>>;
}

export function createMockSocket(overrides: { id?: string; connected?: boolean } = {}): MockSocket {
  const handlers = new Map<string, Set<Handler>>();
  const managerHandlers = new Map<string, Set<Handler>>();

  const on = vi.fn((event: string, fn: Handler) => {
    if (!handlers.has(event)) handlers.set(event, new Set());
    handlers.get(event)!.add(fn);
  });

  const off = vi.fn((event: string, fn?: Handler) => {
    if (!fn) { handlers.delete(event); return; }
    handlers.get(event)?.delete(fn);
  });

  const managerOn = vi.fn((event: string, fn: Handler) => {
    if (!managerHandlers.has(event)) managerHandlers.set(event, new Set());
    managerHandlers.get(event)!.add(fn);
  });

  const managerOff = vi.fn((event: string, fn?: Handler) => {
    if (!fn) { managerHandlers.delete(event); return; }
    managerHandlers.get(event)?.delete(fn);
  });

  return {
    id: overrides.id ?? "socket-self",
    connected: overrides.connected ?? true,
    emit: vi.fn(),
    on,
    off,
    disconnect: vi.fn(),
    io: { on: managerOn, off: managerOff, handlers: managerHandlers },
    handlers,
  };
}

/** Invoke every registered handler for an event with the given args. */
export function triggerSocketEvent(socket: MockSocket, event: string, ...args: unknown[]): void {
  const fns = socket.handlers.get(event);
  if (!fns) return;
  for (const fn of fns) fn(...args);
}

/** Invoke handlers attached to socket.io (manager events: reconnect, reconnect_attempt, ...) */
export function triggerManagerEvent(socket: MockSocket, event: string, ...args: unknown[]): void {
  const fns = socket.io.handlers.get(event);
  if (!fns) return;
  for (const fn of fns) fn(...args);
}

/** Create a mutable socketRef containing the given socket — convenience for hook params. */
export function makeSocketRef(socket: MockSocket | null): React.MutableRefObject<unknown> {
  return { current: socket } as React.MutableRefObject<unknown>;
}

/** Create a generic mutable ref for hook params. */
export function makeRef<T>(value: T): React.MutableRefObject<T> {
  return { current: value };
}

/** Minimal stub of the Excalidraw API surface used by collaboration hooks. */
export function createExcalidrawApiStub(overrides: Partial<{
  elements: unknown[];
  appState: Record<string, unknown>;
  files: Record<string, unknown>;
}> = {}) {
  const state = {
    elements: overrides.elements ?? [],
    appState: overrides.appState ?? { scrollX: 0, scrollY: 0, zoom: { value: 1 } },
    files: overrides.files ?? {},
  };
  return {
    updateScene: vi.fn((scene: { elements?: unknown[]; appState?: Record<string, unknown> }) => {
      if (scene.elements) state.elements = scene.elements;
      if (scene.appState) state.appState = { ...state.appState, ...scene.appState };
    }),
    getSceneElements: vi.fn(() => state.elements as readonly unknown[]),
    getAppState: vi.fn(() => state.appState),
    getFiles: vi.fn(() => state.files),
    _state: state,
  };
}
