import test, { describe, mock, after } from "node:test";
import assert from "node:assert/strict";

describe("diagram-code/convert-to-excalidraw", () => {
  after(() => mock.restoreAll());

  test("mermaidToElements and plantumlToElements both parse then convert", async () => {
    const mermaidParseCalls: string[] = [];
    const plantumlParseCalls: string[] = [];
    const convertCalls: unknown[] = [];

    const mermaidSkeletons = [{ kind: "rect", id: "r1" }];
    const plantumlSkeletons = [{ kind: "ellipse" }];

    mock.module("@drawhaus/mermaid-to-excalidraw", {
      namedExports: {
        parseMermaidToExcalidraw: async (code: string) => {
          mermaidParseCalls.push(code);
          return { elements: mermaidSkeletons };
        },
      },
    });
    mock.module("@drawhaus/plantuml-to-excalidraw", {
      namedExports: {
        parsePlantUMLToExcalidraw: (code: string) => {
          plantumlParseCalls.push(code);
          return { elements: plantumlSkeletons, diagramType: "sequence" };
        },
      },
    });
    mock.module("@excalidraw/excalidraw", {
      namedExports: {
        convertToExcalidrawElements: (skel: unknown) => {
          convertCalls.push(skel);
          return [{ converted: skel === mermaidSkeletons ? "mermaid" : "plantuml" }];
        },
      },
    });

    const { mermaidToElements, plantumlToElements } = await import("../lib/diagram-code/convert-to-excalidraw");

    const mermaidResult = await mermaidToElements("graph TD\nA-->B");
    assert.deepEqual(mermaidParseCalls, ["graph TD\nA-->B"]);
    assert.deepEqual(mermaidResult, [{ converted: "mermaid" }]);

    const plantumlResult = plantumlToElements("@startuml\nAlice -> Bob: hi\n@enduml");
    assert.deepEqual(plantumlParseCalls, ["@startuml\nAlice -> Bob: hi\n@enduml"]);
    assert.deepEqual(plantumlResult, { elements: [{ converted: "plantuml" }], diagramType: "sequence" });

    assert.deepEqual(convertCalls, [mermaidSkeletons, plantumlSkeletons]);
  });
});
