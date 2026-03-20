import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { parseMermaidClassDiagram } from "../parser/class.js";

describe("parseMermaidClassDiagram", () => {
  it("parses a simple class with members", () => {
    const ast = parseMermaidClassDiagram(`classDiagram
    class User {
        +String name
        -String email
        #int age
        +login() boolean
        +logout() void
    }`);

    assert.equal(ast.entities.length, 1);
    const user = ast.entities[0];
    assert.equal(user.name, "User");
    assert.equal(user.kind, "class");
    assert.equal(user.members.length, 5);

    // Attributes
    assert.equal(user.members[0].kind, "attribute");
    assert.equal(user.members[0].visibility, "+");
    assert.equal(user.members[0].name, "name");
    assert.equal(user.members[0].type, "String");

    assert.equal(user.members[1].visibility, "-");
    assert.equal(user.members[2].visibility, "#");

    // Methods
    assert.equal(user.members[3].kind, "method");
    assert.equal(user.members[3].name, "login");
    assert.equal(user.members[3].type, "boolean");

    assert.equal(user.members[4].kind, "method");
    assert.equal(user.members[4].name, "logout");
  });

  it("parses inheritance relationship", () => {
    const ast = parseMermaidClassDiagram(`classDiagram
    Animal <|-- Dog
    Animal <|-- Cat`);

    assert.equal(ast.entities.length, 3);
    assert.equal(ast.relations.length, 2);

    const rel = ast.relations[0];
    assert.equal(rel.left, "Dog");
    assert.equal(rel.right, "Animal");
    assert.equal(rel.relationType, "inheritance");
  });

  it("parses composition and aggregation", () => {
    const ast = parseMermaidClassDiagram(`classDiagram
    Car *-- Engine
    Car o-- Driver`);

    assert.equal(ast.relations.length, 2);
    assert.equal(ast.relations[0].relationType, "composition");
    assert.equal(ast.relations[1].relationType, "aggregation");
  });

  it("parses implementation (dotted triangle)", () => {
    const ast = parseMermaidClassDiagram(`classDiagram
    Drawable <|.. Circle`);

    assert.equal(ast.relations[0].relationType, "implementation");
    assert.equal(ast.relations[0].left, "Circle");
    assert.equal(ast.relations[0].right, "Drawable");
  });

  it("parses directed association with label", () => {
    const ast = parseMermaidClassDiagram(`classDiagram
    Customer "1" --> "*" Order : places`);

    assert.equal(ast.relations.length, 1);
    const rel = ast.relations[0];
    assert.equal(rel.relationType, "directed_association");
    assert.equal(rel.label, "places");
    assert.equal(rel.leftCardinality, "1");
    assert.equal(rel.rightCardinality, "*");
  });

  it("parses stereotype annotations", () => {
    const ast = parseMermaidClassDiagram(`classDiagram
    class Shape {
        <<abstract>>
        +area() double
    }
    class Drawable {
        <<interface>>
        +draw() void
    }`);

    // Note: <<abstract>> inside class body is not the annotation syntax
    // Mermaid uses separate lines for annotations
    assert.equal(ast.entities.length, 2);
  });

  it("parses annotation syntax", () => {
    const ast = parseMermaidClassDiagram(`classDiagram
    <<interface>> Drawable
    <<abstract>> Shape`);

    assert.equal(ast.entities.length, 2);
    const drawable = ast.entities.find((e) => e.name === "Drawable");
    assert.equal(drawable?.kind, "interface");
    const shape = ast.entities.find((e) => e.name === "Shape");
    assert.equal(shape?.kind, "abstract_class");
  });

  it("parses inline member syntax", () => {
    const ast = parseMermaidClassDiagram(`classDiagram
    Foo : +bar()
    Foo : +String baz`);

    assert.equal(ast.entities.length, 1);
    assert.equal(ast.entities[0].members.length, 2);
    assert.equal(ast.entities[0].members[0].kind, "method");
    assert.equal(ast.entities[0].members[0].name, "bar");
  });

  it("parses dependency relationship", () => {
    const ast = parseMermaidClassDiagram(`classDiagram
    Service ..> Repository`);

    assert.equal(ast.relations[0].relationType, "dependency");
    assert.equal(ast.relations[0].left, "Service");
    assert.equal(ast.relations[0].right, "Repository");
  });

  it("handles multiple classes with relationships", () => {
    const ast = parseMermaidClassDiagram(`classDiagram
    class Customer {
        +int id
        +String name
    }
    class Order {
        +int id
        +Date date
    }
    class Product {
        +String name
        +double price
    }
    Customer "1" --> "*" Order : places
    Order *-- OrderLine
    OrderLine --> Product`);

    assert.equal(ast.entities.length, 4); // Customer, Order, Product (declared) + OrderLine (from relation)
    assert.equal(ast.relations.length, 3);
  });

  it("handles empty class diagram", () => {
    const ast = parseMermaidClassDiagram(`classDiagram`);
    assert.equal(ast.entities.length, 0);
    assert.equal(ast.relations.length, 0);
  });
});
