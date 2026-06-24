import { describe, test, vi } from "vitest";
import assert from "node:assert/strict";

const { mermaidParseCalls, plantumlParseCalls, convertCalls, mermaidSkeletons, plantumlSkeletons } = vi.hoisted(() => ({
  mermaidParseCalls: [] as string[],
  plantumlParseCalls: [] as string[],
  convertCalls: [] as unknown[],
  mermaidSkeletons: [{ kind: "rect", id: "r1" }],
  plantumlSkeletons: [{ kind: "ellipse" }],
}));

vi.mock("@drawhaus/mermaid-to-excalidraw", () => ({
  parseMermaidToExcalidraw: async (code: string) => {
    mermaidParseCalls.push(code);
    return { elements: mermaidSkeletons };
  },
}));

vi.mock("@drawhaus/plantuml-to-excalidraw", () => ({
  parsePlantUMLToExcalidraw: (code: string) => {
    plantumlParseCalls.push(code);
    return { elements: plantumlSkeletons, diagramType: "sequence" };
  },
}));

vi.mock("@excalidraw/excalidraw", () => ({
  convertToExcalidrawElements: (skel: unknown) => {
    convertCalls.push(skel);
    return [{ converted: skel === mermaidSkeletons ? "mermaid" : "plantuml" }];
  },
}));

import { mermaidToElements, plantumlToElements } from "../lib/diagram-code/convert-to-excalidraw";

describe("diagram-code/convert-to-excalidraw", () => {
  test("mermaidToElements and plantumlToElements both parse then convert", async () => {
    const mermaidResult = await mermaidToElements("graph TD\nA-->B");
    assert.deepEqual(mermaidParseCalls, ["graph TD\nA-->B"]);
    assert.deepEqual(mermaidResult, [{ converted: "mermaid" }]);

    const plantumlResult = plantumlToElements("@startuml\nAlice -> Bob: hi\n@enduml");
    assert.deepEqual(plantumlParseCalls, ["@startuml\nAlice -> Bob: hi\n@enduml"]);
    assert.deepEqual(plantumlResult, { elements: [{ converted: "plantuml" }], diagramType: "sequence" });

    assert.deepEqual(convertCalls, [mermaidSkeletons, plantumlSkeletons]);
  });
});
