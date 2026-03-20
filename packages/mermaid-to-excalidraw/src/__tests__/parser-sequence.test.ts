import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { parseMermaidSequence } from "../parser/sequence.js";

describe("parseMermaidSequence", () => {
  it("parses participant declarations", () => {
    const ast = parseMermaidSequence(`sequenceDiagram
    participant Alice
    participant Bob`);

    assert.equal(ast.participants.length, 2);
    assert.equal(ast.participants[0].id, "Alice");
    assert.equal(ast.participants[0].type, "participant");
    assert.equal(ast.participants[1].id, "Bob");
  });

  it("parses actor declarations", () => {
    const ast = parseMermaidSequence(`sequenceDiagram
    actor User`);

    assert.equal(ast.participants.length, 1);
    assert.equal(ast.participants[0].id, "User");
    assert.equal(ast.participants[0].type, "actor");
  });

  it("parses participant alias", () => {
    const ast = parseMermaidSequence(`sequenceDiagram
    participant DB as Database`);

    assert.equal(ast.participants.length, 1);
    assert.equal(ast.participants[0].id, "DB");
    assert.equal(ast.participants[0].alias, "Database");
  });

  it("creates implicit participants from messages", () => {
    const ast = parseMermaidSequence(`sequenceDiagram
    Alice->>Bob: Hello`);

    assert.equal(ast.participants.length, 2);
    assert.equal(ast.participants[0].id, "Alice");
    assert.equal(ast.participants[1].id, "Bob");
  });

  it("parses solid arrow message", () => {
    const ast = parseMermaidSequence(`sequenceDiagram
    Alice->>Bob: Hello`);

    assert.equal(ast.items.length, 1);
    const msg = ast.items[0];
    assert.equal(msg.kind, "message");
    if (msg.kind === "message") {
      assert.equal(msg.from, "Alice");
      assert.equal(msg.to, "Bob");
      assert.equal(msg.text, "Hello");
      assert.equal(msg.style, "solid");
      assert.equal(msg.arrowType, "arrow");
    }
  });

  it("parses dashed arrow message", () => {
    const ast = parseMermaidSequence(`sequenceDiagram
    Bob-->>Alice: Response`);

    const msg = ast.items[0];
    assert.equal(msg.kind, "message");
    if (msg.kind === "message") {
      assert.equal(msg.style, "dashed");
      assert.equal(msg.arrowType, "arrow");
    }
  });

  it("parses open arrow message", () => {
    const ast = parseMermaidSequence(`sequenceDiagram
    Alice-)Bob: Async`);

    const msg = ast.items[0];
    assert.equal(msg.kind, "message");
    if (msg.kind === "message") {
      assert.equal(msg.arrowType, "open");
    }
  });

  it("parses cross arrow message", () => {
    const ast = parseMermaidSequence(`sequenceDiagram
    Alice-xBob: Failed`);

    const msg = ast.items[0];
    assert.equal(msg.kind, "message");
    if (msg.kind === "message") {
      assert.equal(msg.arrowType, "cross");
    }
  });

  it("parses Note over single participant", () => {
    const ast = parseMermaidSequence(`sequenceDiagram
    Alice->>Bob: Hi
    Note right of Bob: Thinking`);

    const note = ast.items[1];
    assert.equal(note.kind, "note");
    if (note.kind === "note") {
      assert.equal(note.placement, "rightOf");
      assert.equal(note.participants[0], "Bob");
      assert.equal(note.text, "Thinking");
    }
  });

  it("parses Note over two participants", () => {
    const ast = parseMermaidSequence(`sequenceDiagram
    Note over Alice,Bob: Handshake`);

    const note = ast.items[0];
    assert.equal(note.kind, "note");
    if (note.kind === "note") {
      assert.equal(note.placement, "over");
      assert.deepEqual(note.participants, ["Alice", "Bob"]);
    }
  });

  it("parses alt/else block", () => {
    const ast = parseMermaidSequence(`sequenceDiagram
    participant C as Client
    participant S as Server
    C->>S: Request
    alt Cache hit
        S-->>C: Cached
    else Cache miss
        S->>C: Fresh
    end`);

    assert.equal(ast.items.length, 2); // message + block
    const block = ast.items[1];
    assert.equal(block.kind, "block");
    if (block.kind === "block") {
      assert.equal(block.type, "alt");
      assert.equal(block.label, "Cache hit");
      assert.equal(block.sections.length, 2);
      assert.equal(block.sections[0].items.length, 1); // S-->>C
      assert.equal(block.sections[1].label, "Cache miss");
      assert.equal(block.sections[1].items.length, 1); // S->>C
    }
  });

  it("parses loop block", () => {
    const ast = parseMermaidSequence(`sequenceDiagram
    loop Every 30s
        Alice->>Bob: Ping
        Bob-->>Alice: Pong
    end`);

    assert.equal(ast.items.length, 1);
    const block = ast.items[0];
    assert.equal(block.kind, "block");
    if (block.kind === "block") {
      assert.equal(block.type, "loop");
      assert.equal(block.label, "Every 30s");
      assert.equal(block.sections.length, 1);
      assert.equal(block.sections[0].items.length, 2);
    }
  });

  it("parses multiple messages in sequence", () => {
    const ast = parseMermaidSequence(`sequenceDiagram
    Alice->>Bob: Hello
    Bob-->>Alice: Hi
    Alice-)Bob: Bye`);

    assert.equal(ast.items.length, 3);
    assert.equal(ast.items[0].kind, "message");
    assert.equal(ast.items[1].kind, "message");
    assert.equal(ast.items[2].kind, "message");
  });

  it("handles empty diagram", () => {
    const ast = parseMermaidSequence(`sequenceDiagram`);
    assert.equal(ast.participants.length, 0);
    assert.equal(ast.items.length, 0);
  });

  it("preserves participant declaration order", () => {
    const ast = parseMermaidSequence(`sequenceDiagram
    participant Server
    participant Client
    Client->>Server: Request`);

    // Server declared first, Client second
    assert.equal(ast.participants[0].id, "Server");
    assert.equal(ast.participants[1].id, "Client");
  });

  it("parses playground OAuth2 example", () => {
    const ast = parseMermaidSequence(`sequenceDiagram
    actor User
    participant App
    participant AuthServer as Auth Server
    participant API
    User->>App: Login
    App->>AuthServer: Authorization request
    AuthServer-->>User: Login page
    User->>AuthServer: Credentials
    AuthServer-->>App: Authorization code
    App->>AuthServer: Exchange code for token
    AuthServer-->>App: Access token
    App->>API: Request + token
    API-->>App: Protected resource`);

    assert.equal(ast.participants.length, 4);
    assert.equal(ast.participants[0].type, "actor");
    assert.equal(ast.participants[2].alias, "Auth Server");
    assert.equal(ast.items.length, 9);
  });

  it("parses playground loops & alternatives example", () => {
    const ast = parseMermaidSequence(`sequenceDiagram
    participant C as Client
    participant S as Server
    participant DB
    C->>S: Request data
    alt Cache hit
        S-->>C: Cached response
    else Cache miss
        S->>DB: Query
        DB-->>S: Results
        S-->>C: Fresh response
    end
    loop Every 30s
        C->>S: Heartbeat
        S-->>C: ACK
    end`);

    assert.equal(ast.participants.length, 3);
    // 1 message + 1 alt block + 1 loop block = 3 items
    assert.equal(ast.items.length, 3);

    const altBlock = ast.items[1];
    assert.equal(altBlock.kind, "block");
    if (altBlock.kind === "block") {
      assert.equal(altBlock.type, "alt");
      assert.equal(altBlock.sections.length, 2);
      assert.equal(altBlock.sections[1].items.length, 3); // Query, Results, Fresh response
    }
  });
});
