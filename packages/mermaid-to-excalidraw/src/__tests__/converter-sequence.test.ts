import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { convertSequenceDiagram } from "../converter/sequence.js";

describe("convertSequenceDiagram", () => {
  it("converts a simple message exchange", async () => {
    const result = await convertSequenceDiagram(`sequenceDiagram
    Alice->>Bob: Hello
    Bob-->>Alice: Hi`);

    assert.equal(result.diagramType, "sequenceDiagram");
    assert.ok(result.elements.length > 0);

    const rects = result.elements.filter((e) => e.type === "rectangle");
    const arrows = result.elements.filter((e) => e.type === "arrow");

    // 2 participants × 2 (top + bottom) = 4 rects
    assert.equal(rects.length, 4);
    // 2 messages
    assert.equal(arrows.length, 2);
  });

  it("renders lifelines as dashed lines", async () => {
    const result = await convertSequenceDiagram(`sequenceDiagram
    Alice->>Bob: Hello`);

    const lines = result.elements.filter((e) => e.type === "line");
    // 2 lifelines (one per participant)
    assert.equal(lines.length, 2);
    assert.equal(lines[0].strokeStyle, "dashed");
  });

  it("applies theme colors to participants", async () => {
    const result = await convertSequenceDiagram(`sequenceDiagram
    participant Alice
    Alice->>Bob: Hello`);

    const rects = result.elements.filter((e) => e.type === "rectangle");
    // Participant boxes should have theme stroke color
    assert.equal(rects[0].strokeColor, "#5b8fc9");
  });

  it("applies actor theme to actor declarations", async () => {
    const result = await convertSequenceDiagram(`sequenceDiagram
    actor User
    participant Server
    User->>Server: Request`);

    const rects = result.elements.filter((e) => e.type === "rectangle");
    // First rect (User - actor) should have actor color
    assert.equal(rects[0].strokeColor, "#9678b6");
    // Third rect (Server - participant at top) should have participant color
    assert.equal(rects[1].strokeColor, "#5b8fc9");
  });

  it("renders notes as rectangles with note theme", async () => {
    const result = await convertSequenceDiagram(`sequenceDiagram
    Alice->>Bob: Hi
    Note right of Bob: Thinking`);

    const rects = result.elements.filter((e) => e.type === "rectangle");
    // 2 participants × 2 (top+bottom) + 1 note = 5 rects
    assert.equal(rects.length, 5);

    // Note should have note theme color
    const noteRect = rects.find((r) => r.strokeColor === "#d4a843");
    assert.ok(noteRect, "Should have a note with note theme color");
  });

  it("renders dashed arrows for response messages", async () => {
    const result = await convertSequenceDiagram(`sequenceDiagram
    Alice->>Bob: Request
    Bob-->>Alice: Response`);

    const arrows = result.elements.filter((e) => e.type === "arrow");
    assert.equal(arrows.length, 2);
    assert.equal(arrows[0].strokeStyle, "solid");
    assert.equal(arrows[1].strokeStyle, "dashed");
  });

  it("renders alt/else blocks as dashed containers", async () => {
    const result = await convertSequenceDiagram(`sequenceDiagram
    participant C as Client
    participant S as Server
    C->>S: Request
    alt Success
        S-->>C: 200 OK
    else Error
        S-->>C: 500 Error
    end`);

    const rects = result.elements.filter((e) => e.type === "rectangle");
    // 2 participants × 2 + 1 block container = 5 rects
    assert.ok(rects.length >= 5);

    // Block container should have dashed stroke
    const dashedRects = rects.filter((r) => r.strokeStyle === "dashed");
    assert.ok(dashedRects.length >= 1, "Should have at least 1 dashed block container");
  });

  it("renders loop blocks with label", async () => {
    const result = await convertSequenceDiagram(`sequenceDiagram
    loop Every 5s
        Alice->>Bob: Ping
        Bob-->>Alice: Pong
    end`);

    const texts = result.elements.filter((e) => e.type === "text");
    const loopLabel = texts.find((t) => typeof t.text === "string" && t.text.includes("LOOP"));
    assert.ok(loopLabel, "Should have a LOOP label text");
  });

  it("handles block section separators", async () => {
    const result = await convertSequenceDiagram(`sequenceDiagram
    participant A
    participant B
    alt Path 1
        A->>B: Option 1
    else Path 2
        A->>B: Option 2
    end`);

    const lines = result.elements.filter((e) => e.type === "line");
    // 2 lifelines + 1 section separator = 3 lines
    assert.ok(lines.length >= 3, "Should have lifelines + section separator");
  });

  it("converts all playground basic examples without errors", async () => {
    const examples = [
      `sequenceDiagram
    Alice->>Bob: Hello Bob, how are you?
    Bob-->>Alice: Great, thanks!
    Alice-)Bob: See you later!`,
      `sequenceDiagram
    actor User
    participant Browser
    participant Server
    participant DB as Database
    User->>Browser: Click Login
    Browser->>Server: POST /login
    Server->>DB: SELECT user
    DB-->>Server: User data
    Server-->>Browser: JWT Token
    Browser-->>User: Welcome!`,
      `sequenceDiagram
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
    end`,
    ];

    for (let i = 0; i < examples.length; i++) {
      const result = await convertSequenceDiagram(examples[i]);
      assert.ok(
        result.elements.length > 0,
        `Example ${i + 1} should produce elements`,
      );
      assert.equal(result.diagramType, "sequenceDiagram");
    }
  });

  it("converts all playground real-world examples without errors", async () => {
    const examples = [
      `sequenceDiagram
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
    API-->>App: Protected resource`,
      `sequenceDiagram
    participant A as Alice
    participant S as Server
    participant B as Bob
    A->>S: Connect WebSocket
    B->>S: Connect WebSocket
    S-->>A: Connected
    S-->>B: Connected
    A->>S: Send "Hello!"
    S->>B: Forward "Hello!"
    B->>S: Send "Hi Alice!"
    S->>A: Forward "Hi Alice!"
    Note over A,B: Real-time bidirectional`,
      `sequenceDiagram
    participant C as Client
    participant S as Server
    C->>S: Request
    S-->>C: 500 Error
    Note right of C: Wait 1s
    C->>S: Retry 1
    S-->>C: 500 Error
    Note right of C: Wait 2s
    C->>S: Retry 2
    S-->>C: 200 OK`,
    ];

    for (let i = 0; i < examples.length; i++) {
      const result = await convertSequenceDiagram(examples[i]);
      assert.ok(
        result.elements.length > 0,
        `Real-world example ${i + 1} should produce elements`,
      );
    }
  });
});
