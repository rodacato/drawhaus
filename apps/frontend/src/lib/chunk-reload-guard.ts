const RELOADED_AT_KEY = "drawhaus:chunk-reload-at";
const RELOAD_WINDOW_MS = 10_000;

/**
 * After a deploy the previous build's hashed chunks are gone, so an open tab's lazy
 * imports fail; one reload fetches the new build. The timestamp in sessionStorage stops
 * a chunk that is genuinely missing from reloading the page forever.
 */
export function installChunkReloadGuard(): () => void {
  function onPreloadError(event: Event) {
    if (!claimReload(Date.now())) return;
    event.preventDefault();
    window.location.reload();
  }
  window.addEventListener("vite:preloadError", onPreloadError);
  return () => window.removeEventListener("vite:preloadError", onPreloadError);
}

// Without storage there is no loop protection, so the error goes to the error boundary.
function claimReload(now: number): boolean {
  try {
    const elapsed = now - Number(sessionStorage.getItem(RELOADED_AT_KEY));
    if (elapsed >= 0 && elapsed < RELOAD_WINDOW_MS) return false;
    sessionStorage.setItem(RELOADED_AT_KEY, String(now));
    return true;
  } catch {
    return false;
  }
}
