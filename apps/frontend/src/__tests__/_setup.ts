import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

// jsdom ships no matchMedia; ThemeProvider reads it on mount.
if (!globalThis.matchMedia) {
  globalThis.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })) as typeof globalThis.matchMedia;
}

afterEach(() => {
  cleanup();
});
