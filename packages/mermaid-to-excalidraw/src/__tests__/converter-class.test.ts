import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { convertClassDiagram } from "../converter/class.js";

describe("convertClassDiagram", () => {
  it("converts a simple class to Excalidraw elements", async () => {
    const result = await convertClassDiagram(`classDiagram
    class User {
        +String name
        -String email
        +login() boolean
    }`);

    assert.equal(result.diagramType, "classDiagram");
    assert.ok(result.elements.length > 0);

    // Should have at least: 1 rect + header text + separator + members
    const rects = result.elements.filter((e) => e.type === "rectangle");
    const texts = result.elements.filter((e) => e.type === "text");
    const lines = result.elements.filter((e) => e.type === "line");

    assert.ok(rects.length >= 1, "Should have at least one rectangle");
    assert.ok(texts.length >= 4, "Should have header + 3 members");
    assert.ok(lines.length >= 1, "Should have at least one separator");
  });

  it("converts inheritance with theme colors", async () => {
    const result = await convertClassDiagram(`classDiagram
    Animal <|-- Dog
    Animal <|-- Cat
    class Animal {
        +String name
        +speak() void
    }
    class Dog {
        +String breed
    }
    class Cat {
        +boolean indoor
    }`);

    assert.equal(result.diagramType, "classDiagram");

    const rects = result.elements.filter((e) => e.type === "rectangle");
    const arrows = result.elements.filter((e) => e.type === "arrow");

    assert.equal(rects.length, 3, "Should have 3 class rectangles");
    assert.equal(arrows.length, 2, "Should have 2 inheritance arrows");

    // Verify theme colors are applied
    assert.ok(
      rects.every((r) => r.backgroundColor && r.backgroundColor !== "transparent"),
      "Rectangles should have background colors from theme",
    );
    assert.ok(
      rects.every((r) => r.strokeColor),
      "Rectangles should have stroke colors from theme",
    );

    // Inheritance arrows should have triangle arrowhead
    for (const arrow of arrows) {
      assert.equal(arrow.endArrowhead, "triangle");
    }
  });

  it("applies interface theme style", async () => {
    const result = await convertClassDiagram(`classDiagram
    <<interface>> Drawable
    class Drawable {
        +draw() void
    }`);

    const rects = result.elements.filter((e) => e.type === "rectangle");
    assert.ok(rects.length >= 1);

    // Interface should use dashed stroke
    const mainRect = rects[0];
    assert.equal(mainRect.strokeStyle, "dashed");
    // Interface has sage green stroke
    assert.equal(mainRect.strokeColor, "#6da670");
  });

  it("applies enumeration theme style", async () => {
    const result = await convertClassDiagram(`classDiagram
    <<enumeration>> OrderStatus
    class OrderStatus {
        PENDING
        SHIPPED
        DELIVERED
    }`);

    const rects = result.elements.filter((e) => e.type === "rectangle");
    assert.ok(rects.length >= 1);

    // Enum should use warm grey with gold stroke
    const mainRect = rects[0];
    assert.equal(mainRect.strokeColor, "#c4a94d");
  });

  it("converts relationships with labels", async () => {
    const result = await convertClassDiagram(`classDiagram
    Customer "1" --> "*" Order : places`);

    const arrows = result.elements.filter((e) => e.type === "arrow");
    assert.equal(arrows.length, 1);
    assert.ok(arrows[0].label, "Arrow should have a label");
  });

  it("handles implementation (dashed arrow)", async () => {
    const result = await convertClassDiagram(`classDiagram
    Drawable <|.. Circle`);

    const arrows = result.elements.filter((e) => e.type === "arrow");
    assert.equal(arrows.length, 1);
    assert.equal(arrows[0].strokeStyle, "dashed");
    assert.equal(arrows[0].endArrowhead, "triangle");
  });

  it("handles composition (diamond arrowhead)", async () => {
    const result = await convertClassDiagram(`classDiagram
    Car *-- Engine`);

    const arrows = result.elements.filter((e) => e.type === "arrow");
    assert.equal(arrows.length, 1);
    assert.equal(arrows[0].endArrowhead, "diamond");
  });

  it("converts all playground examples without errors", async () => {
    const examples = [
      // Simple Class
      `classDiagram
    class User {
        +String name
        -String email
        #int age
        +login() boolean
        +logout() void
        -validateEmail() boolean
    }`,
      // Inheritance
      `classDiagram
    Animal <|-- Dog
    Animal <|-- Cat
    Animal <|-- Bird
    class Animal {
        +String name
        +int age
        +speak() void
    }
    class Dog {
        +String breed
        +fetch() void
    }
    class Cat {
        +boolean indoor
        +purr() void
    }
    class Bird {
        +boolean canFly
        +sing() void
    }`,
      // Relationships
      `classDiagram
    Customer "1" --> "*" Order : places
    Order *-- OrderLine
    Order o-- Payment
    OrderLine --> Product
    class Customer {
        +int id
        +String name
    }
    class Order {
        +int id
        +Date date
        +double total
    }
    class OrderLine {
        +int quantity
        +double price
    }
    class Product {
        +String name
        +double price
    }
    class Payment {
        +double amount
        +String method
    }`,
      // Observer Pattern
      `classDiagram
    class Subject {
        <<interface>>
        +attach(Observer o)
        +detach(Observer o)
        +notify()
    }
    class Observer {
        <<interface>>
        +update(Event e)
    }
    Subject <|.. EventBus
    Observer <|.. Logger
    Observer <|.. Analytics
    Subject --> Observer : notifies
    class EventBus {
        -List~Observer~ observers
        +attach(Observer o)
        +detach(Observer o)
        +notify()
    }`,
    ];

    for (let i = 0; i < examples.length; i++) {
      const result = await convertClassDiagram(examples[i]);
      assert.ok(
        result.elements.length > 0,
        `Example ${i + 1} should produce elements`,
      );
      assert.equal(result.diagramType, "classDiagram");
    }
  });
});
