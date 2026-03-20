import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { parseMermaidERDiagram } from "../parser/er.js";

describe("parseMermaidERDiagram", () => {
  it("parses entities with attributes", () => {
    const ast = parseMermaidERDiagram(`erDiagram
    CUSTOMER {
        string name
        string email
        int id PK
    }`);

    assert.equal(ast.entities.length, 1);
    assert.equal(ast.entities[0].name, "CUSTOMER");
    assert.equal(ast.entities[0].attributes.length, 3);

    const pk = ast.entities[0].attributes.find((a) => a.name === "id");
    assert.ok(pk);
    assert.deepEqual(pk.constraints, ["PK"]);
  });

  it("parses entities with FK and UK constraints", () => {
    const ast = parseMermaidERDiagram(`erDiagram
    ORDER {
        int id PK
        int customer_id FK
        string email UK
    }`);

    const fk = ast.entities[0].attributes.find((a) => a.name === "customer_id");
    assert.ok(fk);
    assert.deepEqual(fk.constraints, ["FK"]);

    const uk = ast.entities[0].attributes.find((a) => a.name === "email");
    assert.ok(uk);
    assert.deepEqual(uk.constraints, ["UK"]);
  });

  it("parses attribute comments", () => {
    const ast = parseMermaidERDiagram(`erDiagram
    USER {
        int id PK "Unique identifier"
    }`);

    assert.equal(ast.entities[0].attributes[0].comment, "Unique identifier");
  });

  it("parses identifying relationships", () => {
    const ast = parseMermaidERDiagram(`erDiagram
    CUSTOMER ||--o{ ORDER : places`);

    assert.equal(ast.relations.length, 1);
    assert.equal(ast.relations[0].left, "CUSTOMER");
    assert.equal(ast.relations[0].right, "ORDER");
    assert.equal(ast.relations[0].leftCardinality, "one");
    assert.equal(ast.relations[0].rightCardinality, "many");
    assert.equal(ast.relations[0].lineType, "identifying");
    assert.equal(ast.relations[0].label, "places");
  });

  it("parses non-identifying relationships", () => {
    const ast = parseMermaidERDiagram(`erDiagram
    INVOICE }o..|| PAYMENT : references`);

    assert.equal(ast.relations[0].lineType, "nonIdentifying");
    assert.equal(ast.relations[0].leftCardinality, "many");
    assert.equal(ast.relations[0].rightCardinality, "one");
  });

  it("parses one-to-many with oneOrMore", () => {
    const ast = parseMermaidERDiagram(`erDiagram
    ORDER ||--|{ LINE-ITEM : contains`);

    assert.equal(ast.relations[0].rightCardinality, "oneOrMore");
  });

  it("parses zero-or-one cardinality", () => {
    const ast = parseMermaidERDiagram(`erDiagram
    PERSON |o--|| ADDRESS : lives-at`);

    assert.equal(ast.relations[0].leftCardinality, "zeroOrOne");
    assert.equal(ast.relations[0].rightCardinality, "one");
  });

  it("parses many-to-many relationships", () => {
    const ast = parseMermaidERDiagram(`erDiagram
    POST }o--o{ TAG : tagged`);

    assert.equal(ast.relations[0].leftCardinality, "many");
    assert.equal(ast.relations[0].rightCardinality, "many");
  });

  it("parses relationships without labels", () => {
    const ast = parseMermaidERDiagram(`erDiagram
    A ||--|| B`);

    assert.equal(ast.relations.length, 1);
    assert.equal(ast.relations[0].label, undefined);
  });

  it("creates implicit entities from relationships", () => {
    const ast = parseMermaidERDiagram(`erDiagram
    CUSTOMER ||--o{ ORDER : places`);

    assert.equal(ast.entities.length, 2);
    const names = ast.entities.map((e) => e.name);
    assert.ok(names.includes("CUSTOMER"));
    assert.ok(names.includes("ORDER"));
  });

  it("merges entity from relationship and block", () => {
    const ast = parseMermaidERDiagram(`erDiagram
    CUSTOMER ||--o{ ORDER : places
    CUSTOMER {
        int id PK
        string name
    }`);

    assert.equal(ast.entities.length, 2);
    const customer = ast.entities.find((e) => e.name === "CUSTOMER");
    assert.ok(customer);
    assert.equal(customer.attributes.length, 2);
  });

  it("handles hyphenated entity names", () => {
    const ast = parseMermaidERDiagram(`erDiagram
    LINE-ITEM ||--|| ORDER : belongs-to`);

    const names = ast.entities.map((e) => e.name);
    assert.ok(names.includes("LINE-ITEM"));
  });

  it("handles empty diagram", () => {
    const ast = parseMermaidERDiagram(`erDiagram`);
    assert.equal(ast.entities.length, 0);
    assert.equal(ast.relations.length, 0);
  });

  it("parses playground Basic ER example", () => {
    const ast = parseMermaidERDiagram(`erDiagram
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

    assert.equal(ast.entities.length, 3);
    assert.equal(ast.relations.length, 2);

    const customer = ast.entities.find((e) => e.name === "CUSTOMER");
    assert.equal(customer?.attributes.length, 3);
  });

  it("parses playground Blog Schema example", () => {
    const ast = parseMermaidERDiagram(`erDiagram
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

    assert.equal(ast.entities.length, 4);
    assert.equal(ast.relations.length, 4);

    const tagged = ast.relations.find((r) => r.label === "tagged");
    assert.ok(tagged);
    assert.equal(tagged.leftCardinality, "many");
    assert.equal(tagged.rightCardinality, "many");
  });
});
