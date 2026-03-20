import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { convertFlowchart } from "../converter/flowchart.js";

describe("convertFlowchart", () => {
  it("converts a simple flow to Excalidraw elements", async () => {
    const result = await convertFlowchart(`flowchart TD
    A[Start] --> B[End]`);

    assert.equal(result.diagramType, "flowchart");
    assert.ok(result.elements.length > 0);

    const rects = result.elements.filter((e) => e.type === "rectangle");
    const arrows = result.elements.filter((e) => e.type === "arrow");

    assert.equal(rects.length, 2, "Should have 2 rectangles");
    assert.equal(arrows.length, 1, "Should have 1 arrow");
  });

  it("renders diamond for decision nodes", async () => {
    const result = await convertFlowchart(`flowchart TD
    A[Start] --> B{Decision}
    B --> C[End]`);

    const diamonds = result.elements.filter((e) => e.type === "diamond");
    assert.equal(diamonds.length, 1, "Should have 1 diamond");

    // Decision diamond should use decision theme color
    assert.equal(diamonds[0].strokeColor, "#c4a94d");
  });

  it("renders ellipse for circle nodes", async () => {
    const result = await convertFlowchart(`flowchart TD
    A((Start)) --> B[End]`);

    const ellipses = result.elements.filter((e) => e.type === "ellipse");
    assert.equal(ellipses.length, 1, "Should have 1 ellipse");

    // Circle should use lavender theme color
    assert.equal(ellipses[0].strokeColor, "#9678b6");
  });

  it("renders database nodes as ellipse", async () => {
    const result = await convertFlowchart(`flowchart TD
    A[(Database)]`);

    const ellipses = result.elements.filter((e) => e.type === "ellipse");
    assert.equal(ellipses.length, 1);

    // Database should use sage green
    assert.equal(ellipses[0].strokeColor, "#6da670");
  });

  it("renders rounded rectangles", async () => {
    const result = await convertFlowchart(`flowchart TD
    A(Rounded) --> B([Stadium])`);

    const rects = result.elements.filter((e) => e.type === "rectangle");
    assert.equal(rects.length, 2);

    // Both should have roundness
    assert.ok(rects[0].roundness, "Rounded should have roundness");
    assert.ok(rects[1].roundness, "Stadium should have roundness");
  });

  it("renders subgraphs as dashed containers", async () => {
    const result = await convertFlowchart(`flowchart TB
    subgraph Frontend
        A[React] --> B[Router]
    end`);

    const rects = result.elements.filter((e) => e.type === "rectangle");
    const dashedRects = rects.filter((r) => r.strokeStyle === "dashed");

    assert.ok(dashedRects.length >= 1, "Should have at least 1 dashed rectangle for subgraph");
  });

  it("handles dotted edges", async () => {
    const result = await convertFlowchart(`flowchart LR
    A -.-> B`);

    const arrows = result.elements.filter((e) => e.type === "arrow");
    assert.equal(arrows.length, 1);
    assert.equal(arrows[0].strokeStyle, "dashed");
  });

  it("handles thick edges", async () => {
    const result = await convertFlowchart(`flowchart LR
    A ==> B`);

    const arrows = result.elements.filter((e) => e.type === "arrow");
    assert.equal(arrows.length, 1);
    assert.equal(arrows[0].strokeWidth, 2);
  });

  it("handles no-arrow edges", async () => {
    const result = await convertFlowchart(`flowchart LR
    A --- B`);

    const arrows = result.elements.filter((e) => e.type === "arrow");
    assert.equal(arrows.length, 1);
    assert.equal(arrows[0].endArrowhead, null);
  });

  it("applies theme colors to all nodes", async () => {
    const result = await convertFlowchart(`flowchart TD
    A[Rectangle] --> B{Diamond}
    B --> C((Circle))
    C --> D[(Database)]`);

    const rects = result.elements.filter((e) => e.type === "rectangle");
    const diamonds = result.elements.filter((e) => e.type === "diamond");
    const ellipses = result.elements.filter((e) => e.type === "ellipse");

    // Each shape type should have its own theme color
    assert.ok(rects.length >= 1);
    assert.equal(rects[0].strokeColor, "#5b8fc9"); // flowNode blue

    assert.ok(diamonds.length >= 1);
    assert.equal(diamonds[0].strokeColor, "#c4a94d"); // flowDecision gold

    // Circle and database both use ellipse
    assert.ok(ellipses.length >= 2);
  });

  it("converts all playground basic examples without errors", async () => {
    const examples = [
      `flowchart TD
    A[Start] --> B{Decision}
    B -->|Yes| C[Do something]
    B -->|No| D[Do something else]
    C --> E[End]
    D --> E`,
      `flowchart LR
    A[Input] --> B[Process]
    B --> C[Output]`,
      `flowchart LR
    A --> B
    B --- C
    C -.-> D
    D ==> E`,
    ];

    for (let i = 0; i < examples.length; i++) {
      const result = await convertFlowchart(examples[i]);
      assert.ok(
        result.elements.length > 0,
        `Example ${i + 1} should produce elements`,
      );
      assert.equal(result.diagramType, "flowchart");
    }
  });

  it("converts subgraph examples without errors", async () => {
    const examples = [
      `flowchart TB
    subgraph Frontend
        A[React App] --> B[Router]
    end
    subgraph Backend
        C[Controller] --> D[Service]
        D --> E[Repository]
    end
    B --> C`,
      `flowchart LR
    subgraph Build
        A[Checkout] --> B[Install]
        B --> C[Compile]
    end
    subgraph Test
        D[Unit Tests] --> E[Integration]
        E --> F[E2E]
    end
    subgraph Deploy
        G[Stage] --> H[Production]
    end
    C --> D
    F --> G`,
    ];

    for (let i = 0; i < examples.length; i++) {
      const result = await convertFlowchart(examples[i]);
      assert.ok(
        result.elements.length > 0,
        `Subgraph example ${i + 1} should produce elements`,
      );
    }
  });

  it("converts real-world pattern examples without errors", async () => {
    const examples = [
      `flowchart TD
    A[User Request] --> B{Has Token?}
    B -->|Yes| C{Token Valid?}
    B -->|No| D[Login Page]
    C -->|Yes| E[Grant Access]
    C -->|No| F{Refresh Token?}
    F -->|Yes| G[Refresh] --> E
    F -->|No| D
    D --> H[Enter Credentials]
    H --> I{Valid?}
    I -->|Yes| J[Issue Token] --> E
    I -->|No| D`,
      `flowchart LR
    Client --> Gateway
    Gateway --> AuthSvc[Auth Service]
    Gateway --> OrderSvc[Order Service]
    Gateway --> UserSvc[User Service]
    OrderSvc --> DB1[(Orders DB)]
    UserSvc --> DB2[(Users DB)]
    OrderSvc --> Queue[Message Queue]
    Queue --> NotifSvc[Notification Service]`,
    ];

    for (let i = 0; i < examples.length; i++) {
      const result = await convertFlowchart(examples[i]);
      assert.ok(
        result.elements.length > 0,
        `Pattern example ${i + 1} should produce elements`,
      );
    }
  });
});
