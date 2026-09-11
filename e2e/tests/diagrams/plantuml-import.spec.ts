import type { Page } from "@playwright/test";
import { test, expect } from "../../fixtures/test";

const CONVERTER = "/src/lib/diagram-code/convert-to-excalidraw.ts";

type Conversion = {
  threw: boolean;
  message?: string;
  diagramType?: string;
  types: string[];
};

// Runs the real converter inside the Vite-served app, where its browser-only imports resolve.
async function convert(page: Page, code: string): Promise<Conversion> {
  await page.goto("/");
  return page.evaluate(
    async ({ modulePath, source }) => {
      const { plantumlToElements } = await import(/* @vite-ignore */ modulePath);
      try {
        const { elements, diagramType } = await plantumlToElements(source);
        return {
          threw: false,
          diagramType,
          types: elements.map((e: { type: string }) => e.type),
        };
      } catch (err) {
        return { threw: true, message: (err as Error).message, types: [] };
      }
    },
    { modulePath: CONVERTER, source: code },
  );
}

test.describe("PlantUML Import — Integration", () => {
  test("converts a basic class diagram into boxes and arrows", async ({ page }) => {
    const result = await convert(
      page,
      `@startuml
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
@enduml`,
    );

    expect(result.threw).toBe(false);
    expect(result.diagramType).toBe("class");
    expect(result.types).toContain("rectangle");
    expect(result.types).toContain("arrow");
  });

  test("converts class diagram with inheritance and interfaces", async ({ page }) => {
    const result = await convert(
      page,
      `@startuml
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
@enduml`,
    );

    expect(result.diagramType).toBe("class");
    expect(result.types.filter((t) => t === "arrow")).toHaveLength(2);
    expect(result.types.length).toBeGreaterThan(5);
  });

  test("handles PlantUML without @startuml wrapper", async ({ page }) => {
    const result = await convert(
      page,
      `class Foo {
  +bar: string
}
class Baz {
  +qux: number
}
Foo --> Baz`,
    );

    expect(result.diagramType).toBe("class");
    expect(result.types.length).toBeGreaterThan(0);
  });

  test("converts sequence diagrams", async ({ page }) => {
    const result = await convert(
      page,
      `@startuml
participant Alice
participant Bob
Alice -> Bob: Hello
@enduml`,
    );

    expect(result.threw).toBe(false);
    expect(result.diagramType).toBe("sequence");
    expect(result.types.length).toBeGreaterThan(0);
  });

  test("rejects invalid syntax with a message", async ({ page }) => {
    const result = await convert(page, `@startuml\nclass {{{ invalid syntax\n@enduml`);

    expect(result.threw).toBe(true);
    expect(result.message).toBeTruthy();
  });

  test("rejects diagram types it cannot convert", async ({ page }) => {
    const result = await convert(page, `@startuml\nstart\n:Hello world;\nstop\n@enduml`);

    expect(result.threw).toBe(true);
    expect(result.message).toBe("Unsupported diagram type: activity");
  });

  test("returns empty elements for empty input", async ({ page }) => {
    const result = await convert(page, "   ");

    expect(result.threw).toBe(false);
    expect(result.types).toHaveLength(0);
    expect(result.diagramType).toBe("unknown");
  });
});
