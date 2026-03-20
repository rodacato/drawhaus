import mermaid from "mermaid";

let initialized = false;

function ensureInit() {
  if (initialized) return;
  mermaid.initialize({
    startOnLoad: false,
    theme: "default",
    securityLevel: "strict",
    fontFamily: "sans-serif",
  });
  initialized = true;
}

let renderCounter = 0;

/**
 * Render Mermaid code to an SVG string.
 * Returns the SVG markup or throws on parse/render errors.
 */
export async function renderMermaid(code: string): Promise<string> {
  ensureInit();
  const id = `mermaid-preview-${++renderCounter}`;
  const { svg } = await mermaid.render(id, code);
  return svg;
}
