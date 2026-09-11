import { describe, test, vi } from "vitest";
import assert from "node:assert/strict";

const {
  loaded,
  plantumlState,
  mermaidParseCalls,
  plantumlParseCalls,
  convertCalls,
  mermaidSkeletons,
  plantumlSkeletons,
} = vi.hoisted(() => ({
  loaded: { excalidraw: false, mermaidParser: false },
  plantumlState: { error: null as Error | null },
  mermaidParseCalls: [] as string[],
  plantumlParseCalls: [] as string[],
  convertCalls: [] as unknown[],
  mermaidSkeletons: [{ kind: "rect", id: "r1" }],
  plantumlSkeletons: [{ kind: "ellipse" }],
}));

vi.mock("@drawhaus/mermaid-to-excalidraw", () => {
  loaded.mermaidParser = true;
  return {
    parseMermaidToExcalidraw: async (code: string) => {
      mermaidParseCalls.push(code);
      return { elements: mermaidSkeletons };
    },
  };
});

vi.mock("@drawhaus/plantuml-to-excalidraw", () => ({
  parsePlantUMLToExcalidraw: (code: string) => {
    plantumlParseCalls.push(code);
    if (plantumlState.error) throw plantumlState.error;
    return { elements: plantumlSkeletons, diagramType: "sequence" };
  },
}));

vi.mock("@excalidraw/excalidraw", () => {
  loaded.excalidraw = true;
  return {
    convertToExcalidrawElements: (skel: unknown) => {
      convertCalls.push(skel);
      return [{ converted: skel === mermaidSkeletons ? "mermaid" : "plantuml" }];
    },
  };
});

import { mermaidToElements, plantumlToElements } from "../lib/diagram-code/convert-to-excalidraw";

describe("diagram-code/convert-to-excalidraw", () => {
  test("loads Excalidraw and the Mermaid parser only once a conversion runs, then parses and converts", async () => {
    assert.deepEqual(
      loaded,
      { excalidraw: false, mermaidParser: false },
      "importing the module must not load Excalidraw or the Mermaid parser",
    );

    const mermaidResult = await mermaidToElements("graph TD\nA-->B");
    assert.deepEqual(mermaidParseCalls, ["graph TD\nA-->B"]);
    assert.deepEqual(mermaidResult, [{ converted: "mermaid" }]);

    const plantumlResult = await plantumlToElements("@startuml\nAlice -> Bob: hi\n@enduml");
    assert.deepEqual(plantumlParseCalls, ["@startuml\nAlice -> Bob: hi\n@enduml"]);
    assert.deepEqual(plantumlResult, {
      elements: [{ converted: "plantuml" }],
      diagramType: "sequence",
    });

    assert.deepEqual(convertCalls, [mermaidSkeletons, plantumlSkeletons]);
  });

  test("a PlantUML parse failure rejects with the parser's own error and converts nothing", async () => {
    const parseError = new Error("Line 2, Column 1: unexpected token");
    plantumlState.error = parseError;
    convertCalls.length = 0;

    await assert.rejects(
      () => plantumlToElements("@startuml\n???\n@enduml"),
      (err) => err === parseError,
    );
    assert.deepEqual(convertCalls, []);
  });
});
