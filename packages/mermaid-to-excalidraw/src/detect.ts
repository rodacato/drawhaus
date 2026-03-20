/**
 * Detect the Mermaid diagram type from the first meaningful line.
 * Returns a normalized type string or "unknown".
 */
export function detectDiagramType(definition: string): string {
  const lines = definition.trim().split("\n");

  for (const raw of lines) {
    const line = raw.trim();
    // Skip empty lines and mermaid directives
    if (!line || line.startsWith("%%")) continue;

    // Match known diagram prefixes (order matters: longer prefixes first)
    if (/^flowchart\b/i.test(line) || /^graph\b/i.test(line)) return "flowchart";
    if (/^sequenceDiagram\b/.test(line)) return "sequenceDiagram";
    if (/^classDiagram\b/.test(line)) return "classDiagram";
    if (/^stateDiagram/.test(line)) return "stateDiagram";
    if (/^erDiagram\b/.test(line)) return "erDiagram";
    if (/^gantt\b/i.test(line)) return "gantt";
    if (/^pie\b/i.test(line)) return "pie";
    if (/^mindmap\b/i.test(line)) return "mindmap";
    if (/^timeline\b/i.test(line)) return "timeline";
    if (/^gitGraph\b/i.test(line)) return "gitGraph";
    if (/^quadrantChart\b/i.test(line)) return "quadrantChart";
    if (/^journey\b/i.test(line)) return "journey";
    if (/^requirementDiagram\b/i.test(line)) return "requirementDiagram";
    if (/^C4Context\b/i.test(line)) return "c4";
    if (/^sankey/i.test(line)) return "sankey";
    if (/^xychart/i.test(line)) return "xychart";
    if (/^block/i.test(line)) return "block";

    // If first meaningful line doesn't match, it's unknown
    return "unknown";
  }

  return "unknown";
}
