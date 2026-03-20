import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { convertERDiagram } from "../converter/er.js";

describe("convertERDiagram", () => {
  it("converts entities with attributes to elements", async () => {
    const result = await convertERDiagram(`erDiagram
    CUSTOMER {
        int id PK
        string name
    }`);

    assert.equal(result.diagramType, "erDiagram");
    assert.ok(result.elements.length > 0);

    const rects = result.elements.filter((e) => e.type === "rectangle");
    assert.ok(rects.length >= 1, "Should have container rectangle");

    const texts = result.elements.filter((e) => e.type === "text");
    assert.ok(texts.length >= 3, "Should have entity name + 2 attributes");
  });

  it("applies entity theme colors", async () => {
    const result = await convertERDiagram(`erDiagram
    CUSTOMER {
        int id PK
    }`);

    const rects = result.elements.filter((e) => e.type === "rectangle");
    assert.equal(rects[0].strokeColor, "#5b8fc9");
  });

  it("renders separator line between header and attributes", async () => {
    const result = await convertERDiagram(`erDiagram
    USER {
        int id PK
        string name
    }`);

    const lines = result.elements.filter((e) => e.type === "line");
    assert.ok(lines.length >= 1, "Should have separator line");
  });

  it("converts relationships as arrows", async () => {
    const result = await convertERDiagram(`erDiagram
    CUSTOMER ||--o{ ORDER : places`);

    const arrows = result.elements.filter((e) => e.type === "arrow");
    assert.equal(arrows.length, 1);
    // ER relationships have no arrowheads (use labels for cardinality)
    assert.equal(arrows[0].startArrowhead, null);
    assert.equal(arrows[0].endArrowhead, null);
  });

  it("renders non-identifying relationships as dashed", async () => {
    const result = await convertERDiagram(`erDiagram
    A }o..|| B : references`);

    const arrows = result.elements.filter((e) => e.type === "arrow");
    assert.equal(arrows[0].strokeStyle, "dashed");
  });

  it("renders identifying relationships as solid", async () => {
    const result = await convertERDiagram(`erDiagram
    A ||--o{ B : contains`);

    const arrows = result.elements.filter((e) => e.type === "arrow");
    assert.equal(arrows[0].strokeStyle, "solid");
  });

  it("includes cardinality in arrow labels", async () => {
    const result = await convertERDiagram(`erDiagram
    CUSTOMER ||--o{ ORDER : places`);

    const arrows = result.elements.filter((e) => e.type === "arrow");
    // Label should include cardinality symbols and relation name
    const label = arrows[0].label as { text: string } | undefined;
    assert.ok(label);
    assert.ok(label.text.includes("places"));
    assert.ok(label.text.includes("1"));
    assert.ok(label.text.includes("0..*"));
  });

  it("converts bare entities without attributes", async () => {
    const result = await convertERDiagram(`erDiagram
    CUSTOMER ||--o{ ORDER : places`);

    const rects = result.elements.filter((e) => e.type === "rectangle");
    assert.equal(rects.length, 2, "Should have 2 entity rectangles");

    const texts = result.elements.filter((e) => e.type === "text");
    assert.equal(texts.length, 2, "Should have 2 entity name texts");
  });

  it("converts playground Basic ER example without errors", async () => {
    const result = await convertERDiagram(`erDiagram
    CUSTOMER ||--o{ ORDER : places
    ORDER ||--|{ LINE-ITEM : contains
    CUSTOMER {
        string name
        string email
        int id PK
    }
    ORDER {
        int id PK
        date created
        string status
    }
    LINE-ITEM {
        int quantity
        float price
    }`);

    assert.ok(result.elements.length > 0);
    assert.equal(result.diagramType, "erDiagram");

    const rects = result.elements.filter((e) => e.type === "rectangle");
    assert.equal(rects.length, 3, "Should have 3 entity rectangles");

    const arrows = result.elements.filter((e) => e.type === "arrow");
    assert.equal(arrows.length, 2, "Should have 2 relationship arrows");
  });

  it("converts playground Blog Schema example without errors", async () => {
    const result = await convertERDiagram(`erDiagram
    USER ||--o{ POST : writes
    USER ||--o{ COMMENT : authors
    POST ||--o{ COMMENT : has
    POST }o--o{ TAG : tagged
    USER {
        int id PK
        string username
        string email
    }
    POST {
        int id PK
        string title
        text content
        date published
    }
    COMMENT {
        int id PK
        text body
        date created
    }
    TAG {
        int id PK
        string name
    }`);

    assert.ok(result.elements.length > 0);

    const rects = result.elements.filter((e) => e.type === "rectangle");
    assert.equal(rects.length, 4, "Should have 4 entity rectangles");

    const arrows = result.elements.filter((e) => e.type === "arrow");
    assert.equal(arrows.length, 4, "Should have 4 relationship arrows");
  });
});
