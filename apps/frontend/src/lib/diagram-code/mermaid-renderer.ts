type Mermaid = (typeof import("mermaid"))["default"];

let mermaidReady: Promise<Mermaid> | null = null;

function loadMermaid(): Promise<Mermaid> {
  mermaidReady ??= import("mermaid").then(({ default: mermaid }) => {
    mermaid.initialize({
      startOnLoad: false,
      theme: "default",
      securityLevel: "strict",
      fontFamily: "sans-serif",
    });
    return mermaid;
  });
  return mermaidReady;
}

let renderCounter = 0;

/**
 * Render Mermaid code to an SVG string.
 * Returns the SVG markup or throws on parse/render errors.
 */
export async function renderMermaid(code: string): Promise<string> {
  const mermaid = await loadMermaid();
  const id = `mermaid-preview-${++renderCounter}`;
  const { svg } = await mermaid.render(id, code);
  return svg;
}
