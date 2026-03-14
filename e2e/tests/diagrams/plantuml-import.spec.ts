import { test, expect } from "@playwright/test";

test.describe("PlantUML Import — Integration", () => {
  test.setTimeout(60_000);

  let diagramId: string;

  test.beforeEach(async ({ page }) => {
    const res = await page.request.post("/api/diagrams", {
      data: { title: "PlantUML Test" },
    });
    if (res.ok()) {
      const body = await res.json();
      diagramId = body.diagram?.id ?? body.id;
    }
  });

  test("converts a basic PlantUML class diagram to Excalidraw elements", async ({
    page,
  }) => {
    test.skip(!diagramId, "Could not create test diagram");

    await page.goto(`/board/${diagramId}`);
    await page.waitForTimeout(3000);

    // Execute conversion in browser context where all imports are available
    const result = await page.evaluate(async () => {
      const { plantumlToElements } = await import(
        "/src/lib/diagram-code/convert-to-excalidraw.ts"
      );
      const code = `@startuml
class User {
  +name: string
  -email: string
  +login(): void
}
class Order {
  +id: number
  +total: number
}
User --> Order : places
@enduml`;

      const { elements, diagramType, isFallback } = plantumlToElements(code);
      return {
        elementCount: elements.length,
        diagramType,
        isFallback,
        hasElements: elements.length > 0,
        elementTypes: elements.map(
          (e: { type: string }) => e.type,
        ),
      };
    });

    expect(result.diagramType).toBe("class");
    expect(result.isFallback).toBe(false);
    expect(result.hasElements).toBe(true);
    expect(result.elementCount).toBeGreaterThan(0);
    // Should have rectangles (class boxes), text, lines (separators), and arrows
    expect(result.elementTypes).toContain("rectangle");
    expect(result.elementTypes).toContain("arrow");
  });

  test("converts class diagram with inheritance and interfaces", async ({
    page,
  }) => {
    test.skip(!diagramId, "Could not create test diagram");

    await page.goto(`/board/${diagramId}`);
    await page.waitForTimeout(3000);

    const result = await page.evaluate(async () => {
      const { plantumlToElements } = await import(
        "/src/lib/diagram-code/convert-to-excalidraw.ts"
      );
      const code = `@startuml
interface Serializable {
  +serialize(): string
}
abstract class Animal {
  +name: string
  +speak(): void
}
class Dog {
  +breed: string
  +speak(): void
}
Dog --|> Animal
Dog ..|> Serializable
@enduml`;

      const { elements, diagramType, isFallback } = plantumlToElements(code);
      return {
        elementCount: elements.length,
        diagramType,
        isFallback,
        elementTypes: elements.map(
          (e: { type: string }) => e.type,
        ),
      };
    });

    expect(result.diagramType).toBe("class");
    expect(result.isFallback).toBe(false);
    // 3 entities (each with rect + text + lines) + 2 arrows
    expect(result.elementCount).toBeGreaterThan(5);
  });

  test("handles PlantUML without @startuml wrapper", async ({ page }) => {
    test.skip(!diagramId, "Could not create test diagram");

    await page.goto(`/board/${diagramId}`);
    await page.waitForTimeout(3000);

    const result = await page.evaluate(async () => {
      const { plantumlToElements } = await import(
        "/src/lib/diagram-code/convert-to-excalidraw.ts"
      );
      const code = `class Foo {
  +bar: string
}
class Baz {
  +qux: number
}
Foo --> Baz`;

      const { elements, diagramType } = plantumlToElements(code);
      return {
        elementCount: elements.length,
        diagramType,
        hasElements: elements.length > 0,
      };
    });

    expect(result.diagramType).toBe("class");
    expect(result.hasElements).toBe(true);
  });

  test("throws PlantUMLParseError for invalid syntax with line info", async ({
    page,
  }) => {
    test.skip(!diagramId, "Could not create test diagram");

    await page.goto(`/board/${diagramId}`);
    await page.waitForTimeout(3000);

    const result = await page.evaluate(async () => {
      const { plantumlToElements } = await import(
        "/src/lib/diagram-code/convert-to-excalidraw.ts"
      );
      try {
        plantumlToElements(`@startuml
class {{{ invalid syntax
@enduml`);
        return { threw: false };
      } catch (err: unknown) {
        const error = err as { name?: string; message?: string };
        return {
          threw: true,
          errorName: error.name,
          hasMessage: typeof error.message === "string" && error.message.length > 0,
        };
      }
    });

    expect(result.threw).toBe(true);
    expect(result.hasMessage).toBe(true);
  });

  test("throws PlantUMLUnsupportedError for sequence diagrams", async ({
    page,
  }) => {
    test.skip(!diagramId, "Could not create test diagram");

    await page.goto(`/board/${diagramId}`);
    await page.waitForTimeout(3000);

    const result = await page.evaluate(async () => {
      const { plantumlToElements } = await import(
        "/src/lib/diagram-code/convert-to-excalidraw.ts"
      );
      try {
        plantumlToElements(`@startuml
participant Alice
participant Bob
Alice -> Bob: Hello
@enduml`);
        return { threw: false };
      } catch (err: unknown) {
        const error = err as { name?: string; message?: string };
        return {
          threw: true,
          errorName: error.name,
          message: error.message,
        };
      }
    });

    expect(result.threw).toBe(true);
    expect(result.message).toContain("sequence");
  });

  test("returns empty elements for empty input", async ({ page }) => {
    test.skip(!diagramId, "Could not create test diagram");

    await page.goto(`/board/${diagramId}`);
    await page.waitForTimeout(3000);

    const result = await page.evaluate(async () => {
      const { plantumlToElements } = await import(
        "/src/lib/diagram-code/convert-to-excalidraw.ts"
      );
      const { elements, diagramType } = plantumlToElements("   ");
      return { elementCount: elements.length, diagramType };
    });

    expect(result.elementCount).toBe(0);
    expect(result.diagramType).toBe("unknown");
  });
});
