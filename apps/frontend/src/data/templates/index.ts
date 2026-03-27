export type BuiltInTemplate = {
  name: string;
  description: string;
  category: string;
  icon: string;
  elements: unknown[];
  appState: Record<string, unknown>;
};

// Deterministic seed from element id — avoids random values while keeping
// roughjs rendering consistent across loads.
let _seedCounter = 1000;
function stableSeed(): number {
  return _seedCounter++;
}

// Common Excalidraw element defaults that must be present for updateScene()
// to render elements correctly (initialData normalizes via restoreElements,
// but scene-from-db / updateScene does NOT).
function baseProps() {
  return {
    seed: stableSeed(),
    version: 1,
    versionNonce: stableSeed(),
    isDeleted: false,
    opacity: 100,
    angle: 0,
    groupIds: [] as string[],
    frameId: null,
    link: null,
    locked: false,
    updated: 1,
  };
}

// Helper to create a rectangle element
function rect(id: string, x: number, y: number, w: number, h: number, label: string, color = "#a5d8ff"): unknown[] {
  return [
    {
      ...baseProps(),
      id,
      type: "rectangle",
      x, y,
      width: w,
      height: h,
      strokeColor: "#1e1e1e",
      backgroundColor: color,
      fillStyle: "solid",
      strokeWidth: 2,
      roughness: 1,
      roundness: { type: 3 },
      boundElements: [{ id: `${id}_text`, type: "text" }],
    },
    {
      ...baseProps(),
      id: `${id}_text`,
      type: "text",
      x: x + 10,
      y: y + h / 2 - 12,
      width: w - 20,
      height: 24,
      text: label,
      fontSize: 16,
      fontFamily: 5,
      textAlign: "center",
      verticalAlign: "middle",
      containerId: id,
      strokeColor: "#1e1e1e",
      backgroundColor: "transparent",
      fillStyle: "solid",
      strokeWidth: 2,
      roughness: 1,
    },
  ];
}

// Helper to create an arrow
function arrow(id: string, startX: number, startY: number, endX: number, endY: number, label?: string): unknown[] {
  const elements: unknown[] = [
    {
      ...baseProps(),
      id,
      type: "arrow",
      x: startX,
      y: startY,
      width: endX - startX,
      height: endY - startY,
      points: [[0, 0], [endX - startX, endY - startY]],
      strokeColor: "#1e1e1e",
      backgroundColor: "transparent",
      fillStyle: "solid",
      strokeWidth: 2,
      roughness: 1,
      roundness: { type: 2 },
      endArrowhead: "arrow",
      boundElements: label ? [{ id: `${id}_label`, type: "text" }] : [],
    },
  ];
  if (label) {
    elements.push({
      ...baseProps(),
      id: `${id}_label`,
      type: "text",
      x: startX + (endX - startX) / 2 - 20,
      y: startY + (endY - startY) / 2 - 12,
      width: 40,
      height: 24,
      text: label,
      fontSize: 14,
      fontFamily: 5,
      textAlign: "center",
      verticalAlign: "middle",
      containerId: id,
      strokeColor: "#1e1e1e",
      backgroundColor: "transparent",
      fillStyle: "solid",
      strokeWidth: 2,
      roughness: 1,
    });
  }
  return elements;
}

// ── System Architecture ──
const systemArchitectureElements = [
  ...rect("client", 300, 50, 200, 60, "Client / Browser", "#d0bfff"),
  ...arrow("a1", 400, 110, 400, 180),
  ...rect("cdn", 300, 180, 200, 60, "CDN / Load Balancer", "#ffd8a8"),
  ...arrow("a2", 400, 240, 400, 310),
  ...rect("api", 300, 310, 200, 60, "API Server", "#a5d8ff"),
  ...arrow("a3", 300, 340, 100, 340),
  ...rect("cache", 0, 310, 100, 60, "Cache (Redis)", "#ffec99"),
  ...arrow("a4", 400, 370, 400, 450),
  ...rect("db", 300, 450, 200, 60, "Database (Postgres)", "#b2f2bb"),
  ...arrow("a5", 500, 340, 700, 340),
  ...rect("queue", 700, 310, 140, 60, "Message Queue", "#ffc9c9"),
  ...arrow("a6", 770, 370, 770, 450),
  ...rect("worker", 700, 450, 140, 60, "Worker Service", "#ffc9c9"),
];

// ── ER Diagram ──
const erDiagramElements = [
  ...rect("users_tbl", 50, 50, 220, 160, "Users\n─────────\nid: UUID PK\nname: TEXT\nemail: TEXT\ncreated_at: TIMESTAMP", "#a5d8ff"),
  ...rect("orders_tbl", 400, 50, 220, 160, "Orders\n─────────\nid: UUID PK\nuser_id: UUID FK\ntotal: DECIMAL\nstatus: TEXT", "#b2f2bb"),
  ...rect("products_tbl", 400, 300, 220, 160, "Products\n─────────\nid: UUID PK\nname: TEXT\nprice: DECIMAL\nstock: INTEGER", "#ffd8a8"),
  ...rect("order_items", 750, 150, 220, 140, "Order Items\n─────────\norder_id: UUID FK\nproduct_id: UUID FK\nquantity: INTEGER", "#d0bfff"),
  ...arrow("rel1", 270, 130, 400, 130, "1:N"),
  ...arrow("rel2", 620, 130, 750, 200, "1:N"),
  ...arrow("rel3", 620, 380, 750, 290, "1:N"),
];

// ── Sequence Diagram ──
const sequenceDiagramElements = [
  ...rect("actor_client", 50, 50, 120, 40, "Client", "#d0bfff"),
  ...rect("actor_api", 250, 50, 120, 40, "API", "#a5d8ff"),
  ...rect("actor_db", 450, 50, 120, 40, "Database", "#b2f2bb"),
  // Lifelines (using thin rectangles)
  ...rect("life1", 105, 90, 10, 300, "", "#e9ecef"),
  ...rect("life2", 305, 90, 10, 300, "", "#e9ecef"),
  ...rect("life3", 505, 90, 10, 300, "", "#e9ecef"),
  // Messages
  ...arrow("msg1", 115, 130, 305, 130, "POST /api"),
  ...arrow("msg2", 315, 170, 505, 170, "INSERT"),
  ...arrow("msg3", 505, 210, 315, 210, "OK"),
  ...arrow("msg4", 305, 250, 115, 250, "201 Created"),
];

// ── Sprint Retro Board ──
const sprintRetroElements = [
  ...rect("header_good", 50, 30, 250, 50, "What Went Well", "#b2f2bb"),
  ...rect("header_bad", 350, 30, 250, 50, "What Didn't", "#ffc9c9"),
  ...rect("header_action", 650, 30, 250, 50, "Action Items", "#a5d8ff"),
  // Sticky notes
  ...rect("good1", 60, 110, 230, 60, "Deployed on time", "#d8f5a2"),
  ...rect("good2", 60, 190, 230, 60, "Good test coverage", "#d8f5a2"),
  ...rect("bad1", 360, 110, 230, 60, "Too many meetings", "#ffcece"),
  ...rect("bad2", 360, 190, 230, 60, "Unclear requirements", "#ffcece"),
  ...rect("action1", 660, 110, 230, 60, "Async standups", "#bac8ff"),
  ...rect("action2", 660, 190, 230, 60, "Spec review before sprint", "#bac8ff"),
];

// ── ADR Visual ──
const adrElements = [
  ...rect("adr_title", 200, 30, 400, 50, "ADR: [Decision Title]", "#d0bfff"),
  ...rect("adr_context", 50, 120, 300, 100, "Context\n─────────\nDescribe the situation\nand forces at play", "#ffec99"),
  ...rect("adr_decision", 400, 120, 300, 100, "Decision\n─────────\nWhat was decided\nand why", "#b2f2bb"),
  ...rect("adr_cons", 200, 280, 400, 100, "Consequences\n─────────\nPositive and negative outcomes\nof this decision", "#ffc9c9"),
  ...arrow("adr_a1", 200, 220, 300, 280),
  ...arrow("adr_a2", 550, 220, 500, 280),
];

// ── API Flow ──
const apiFlowElements = [
  ...rect("mobile", 50, 200, 120, 50, "Mobile App", "#d0bfff"),
  ...rect("web", 50, 50, 120, 50, "Web App", "#d0bfff"),
  ...arrow("af1", 170, 75, 280, 150),
  ...arrow("af2", 170, 225, 280, 180),
  ...rect("gateway", 280, 140, 160, 60, "API Gateway", "#ffd8a8"),
  ...arrow("af3", 440, 170, 550, 100),
  ...arrow("af4", 440, 170, 550, 250),
  ...rect("svc1", 550, 70, 150, 60, "Auth Service", "#a5d8ff"),
  ...rect("svc2", 550, 220, 150, 60, "Data Service", "#a5d8ff"),
  ...arrow("af5", 700, 100, 800, 170),
  ...arrow("af6", 700, 250, 800, 200),
  ...rect("store", 800, 155, 130, 60, "Database", "#b2f2bb"),
];

// ── User Flow ──
const userFlowElements = [
  ...rect("uf_start", 50, 150, 120, 50, "Landing Page", "#d0bfff"),
  ...arrow("uf1", 170, 175, 250, 175),
  ...rect("uf_signup", 250, 150, 120, 50, "Sign Up", "#a5d8ff"),
  ...arrow("uf2", 370, 175, 450, 175),
  ...rect("uf_onboard", 450, 150, 140, 50, "Onboarding", "#ffd8a8"),
  ...arrow("uf3", 590, 175, 670, 175),
  ...rect("uf_dash", 670, 150, 130, 50, "Dashboard", "#b2f2bb"),
  ...arrow("uf4", 520, 200, 520, 270),
  ...rect("uf_skip", 460, 270, 120, 50, "Skip (exit)", "#ffc9c9"),
];

export const builtInTemplates: BuiltInTemplate[] = [
  {
    name: "System Architecture",
    description: "Services, databases, caches, and message queues connected with arrows",
    category: "architecture",
    icon: "🏗",
    elements: systemArchitectureElements,
    appState: {},
  },
  {
    name: "ER Diagram",
    description: "Database tables with columns, primary keys, and relationships",
    category: "database",
    icon: "🗄",
    elements: erDiagramElements,
    appState: {},
  },
  {
    name: "Sequence Diagram",
    description: "Actors, lifelines, and messages for API or service interactions",
    category: "architecture",
    icon: "🔀",
    elements: sequenceDiagramElements,
    appState: {},
  },
  {
    name: "Sprint Retro Board",
    description: "Three columns: What Went Well, What Didn't, Action Items",
    category: "agile",
    icon: "🔄",
    elements: sprintRetroElements,
    appState: {},
  },
  {
    name: "ADR Visual",
    description: "Architecture Decision Record: Context, Decision, Consequences",
    category: "architecture",
    icon: "📋",
    elements: adrElements,
    appState: {},
  },
  {
    name: "API Flow",
    description: "Client apps, API gateway, microservices, and database connections",
    category: "architecture",
    icon: "🌐",
    elements: apiFlowElements,
    appState: {},
  },
  {
    name: "User Flow",
    description: "User journey from landing page through signup, onboarding, and dashboard",
    category: "process",
    icon: "👤",
    elements: userFlowElements,
    appState: {},
  },
];
