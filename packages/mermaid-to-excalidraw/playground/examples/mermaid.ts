export interface Example {
  title: string;
  description: string;
  code: string;
}

export type SupportLevel = "native" | "fallback" | "unsupported";

export interface ExampleSection {
  title: string;
  supported: boolean;
  supportLevel: SupportLevel;
  examples: Example[];
}

// ─── Supported: Flowchart Diagrams ──────────────────────────────────────────

const FLOWCHART_BASICS: ExampleSection = {
  title: "Flowchart — Basics",
  supported: true,
  supportLevel: "native",
  examples: [
    {
      title: "Simple Flow",
      description: "Linear top-down flowchart",
      code: `flowchart TD
    A[Start] --> B{Decision}
    B -->|Yes| C[Do something]
    B -->|No| D[Do something else]
    C --> E[End]
    D --> E`,
    },
    {
      title: "Left to Right",
      description: "Horizontal flowchart",
      code: `flowchart LR
    A[Input] --> B[Process]
    B --> C[Output]`,
    },
    {
      title: "Node Shapes",
      description: "Different node shapes",
      code: `flowchart TD
    A[Rectangle] --> B(Rounded)
    B --> C([Stadium])
    C --> D[[Subroutine]]
    D --> E[(Database)]
    E --> F((Circle))
    F --> G{Diamond}
    G --> H>Asymmetric]`,
    },
    {
      title: "Link Styles",
      description: "Different arrow and link types",
      code: `flowchart LR
    A --> B
    B --- C
    C -.-> D
    D ==> E
    E --text--> F
    F -.text.-> G`,
    },
  ],
};

const FLOWCHART_SUBGRAPHS: ExampleSection = {
  title: "Flowchart — Subgraphs",
  supported: true,
  supportLevel: "native",
  examples: [
    {
      title: "Basic Subgraph",
      description: "Grouping nodes in subgraphs",
      code: `flowchart TB
    subgraph Frontend
        A[React App] --> B[Router]
    end
    subgraph Backend
        C[Controller] --> D[Service]
        D --> E[Repository]
    end
    B --> C`,
    },
    {
      title: "Nested Subgraphs",
      description: "Subgraphs within subgraphs",
      code: `flowchart TB
    subgraph Cloud
        subgraph VPC
            subgraph Public
                LB[Load Balancer]
            end
            subgraph Private
                APP[App Server]
                DB[(Database)]
            end
        end
    end
    LB --> APP --> DB`,
    },
    {
      title: "CI/CD Pipeline",
      description: "Real-world pipeline flow",
      code: `flowchart LR
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
    },
  ],
};

const FLOWCHART_PATTERNS: ExampleSection = {
  title: "Flowchart — Real-World Patterns",
  supported: true,
  supportLevel: "native",
  examples: [
    {
      title: "Auth Flow",
      description: "Authentication decision flow",
      code: `flowchart TD
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
    },
    {
      title: "Error Handling",
      description: "Try-catch-finally pattern",
      code: `flowchart TD
    A[Start] --> B[Try Operation]
    B --> C{Success?}
    C -->|Yes| D[Process Result]
    C -->|No| E[Catch Error]
    E --> F{Retryable?}
    F -->|Yes| G[Wait & Retry] --> B
    F -->|No| H[Log Error]
    D --> I[Finally: Cleanup]
    H --> I
    I --> J[End]`,
    },
    {
      title: "Microservices",
      description: "Service communication pattern",
      code: `flowchart LR
    Client --> Gateway
    Gateway --> AuthSvc[Auth Service]
    Gateway --> OrderSvc[Order Service]
    Gateway --> UserSvc[User Service]
    OrderSvc --> DB1[(Orders DB)]
    UserSvc --> DB2[(Users DB)]
    OrderSvc --> Queue[Message Queue]
    Queue --> NotifSvc[Notification Service]`,
    },
  ],
};

// ─── Supported: Class Diagrams ──────────────────────────────────────────────

const CLASS_BASICS: ExampleSection = {
  title: "Class Diagrams — Basics",
  supported: true,
  supportLevel: "native",
  examples: [
    {
      title: "Simple Class",
      description: "Attributes and methods",
      code: `classDiagram
    class User {
        +String name
        -String email
        #int age
        +login() boolean
        +logout() void
        -validateEmail() boolean
    }`,
    },
    {
      title: "Inheritance",
      description: "Parent-child class hierarchy",
      code: `classDiagram
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
    },
    {
      title: "Relationships",
      description: "Different relationship types",
      code: `classDiagram
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
    },
  ],
};

const CLASS_PATTERNS: ExampleSection = {
  title: "Class Diagrams — Patterns",
  supported: true,
  supportLevel: "native",
  examples: [
    {
      title: "Interface & Abstract",
      description: "Interfaces and abstract classes",
      code: `classDiagram
    class Shape {
        <<abstract>>
        +String color
        +area() double*
        +perimeter() double*
    }
    class Drawable {
        <<interface>>
        +draw() void
    }
    Shape <|-- Circle
    Shape <|-- Rectangle
    Drawable <|.. Circle
    Drawable <|.. Rectangle
    class Circle {
        +double radius
        +area() double
        +perimeter() double
        +draw() void
    }
    class Rectangle {
        +double width
        +double height
        +area() double
        +perimeter() double
        +draw() void
    }`,
    },
    {
      title: "Observer Pattern",
      description: "Classic design pattern",
      code: `classDiagram
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
    },
    {
      title: "Enum & Annotations",
      description: "Enums and annotation stereotypes",
      code: `classDiagram
    class OrderStatus {
        <<enumeration>>
        PENDING
        PROCESSING
        SHIPPED
        DELIVERED
        CANCELLED
    }
    class Order {
        +int id
        +OrderStatus status
    }
    Order --> OrderStatus`,
    },
  ],
};

// ─── Supported: Sequence Diagrams ───────────────────────────────────────────

const SEQUENCE_BASICS: ExampleSection = {
  title: "Sequence Diagrams — Basics",
  supported: true,
  supportLevel: "native",
  examples: [
    {
      title: "Simple Messages",
      description: "Request-response between participants",
      code: `sequenceDiagram
    Alice->>Bob: Hello Bob, how are you?
    Bob-->>Alice: Great, thanks!
    Alice-)Bob: See you later!`,
    },
    {
      title: "Participant Types",
      description: "Actor and participant declarations",
      code: `sequenceDiagram
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
    },
    {
      title: "Loops & Alternatives",
      description: "Control flow in sequences",
      code: `sequenceDiagram
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
    },
  ],
};

const SEQUENCE_PATTERNS: ExampleSection = {
  title: "Sequence Diagrams — Real-World",
  supported: true,
  supportLevel: "native",
  examples: [
    {
      title: "OAuth2 Flow",
      description: "Authorization code grant",
      code: `sequenceDiagram
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
    },
    {
      title: "WebSocket Chat",
      description: "Real-time messaging flow",
      code: `sequenceDiagram
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
    },
    {
      title: "Error Recovery",
      description: "Retry with exponential backoff",
      code: `sequenceDiagram
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
    },
  ],
};

// ─── Unsupported Diagram Types ──────────────────────────────────────────────

const ENTITY_RELATIONSHIP: ExampleSection = {
  title: "Entity Relationship Diagrams",
  supported: true,
  supportLevel: "fallback",
  examples: [
    {
      title: "Basic ER",
      description: "Tables with relationships",
      code: `erDiagram
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
    }`,
    },
    {
      title: "Blog Schema",
      description: "Blog database model",
      code: `erDiagram
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
    }`,
    },
  ],
};

const STATE_DIAGRAMS: ExampleSection = {
  title: "State Diagrams",
  supported: true,
  supportLevel: "fallback",
  examples: [
    {
      title: "Simple State Machine",
      description: "States with transitions",
      code: `stateDiagram-v2
    [*] --> Idle
    Idle --> Processing : start
    Processing --> Done : complete
    Processing --> Error : fail
    Error --> Idle : reset
    Done --> [*]`,
    },
    {
      title: "Composite States",
      description: "Nested state machines",
      code: `stateDiagram-v2
    [*] --> Active
    state Active {
        [*] --> Running
        Running --> Paused : pause
        Paused --> Running : resume
    }
    Active --> Terminated : kill
    Terminated --> [*]`,
    },
  ],
};

const GANTT_DIAGRAMS: ExampleSection = {
  title: "Gantt Diagrams",
  supported: true,
  supportLevel: "fallback",
  examples: [
    {
      title: "Project Timeline",
      description: "Tasks with dependencies",
      code: `gantt
    title Project Timeline
    dateFormat YYYY-MM-DD
    section Design
        Wireframes       :a1, 2024-01-01, 7d
        UI Mockups       :a2, after a1, 5d
    section Development
        Frontend         :b1, after a2, 14d
        Backend          :b2, after a2, 14d
        Integration      :b3, after b1, 7d
    section Testing
        QA               :c1, after b3, 7d
        UAT              :c2, after c1, 5d`,
    },
    {
      title: "Sprint Planning",
      description: "Agile sprint breakdown",
      code: `gantt
    title Sprint 12
    dateFormat YYYY-MM-DD
    section Stories
        Auth refactor    :active, s1, 2024-03-01, 3d
        Search feature   :s2, after s1, 4d
        Bug fixes        :s3, after s1, 2d
    section Review
        Code review      :r1, after s2, 1d
        QA sign-off      :r2, after r1, 1d`,
    },
  ],
};

const PIE_DIAGRAMS: ExampleSection = {
  title: "Pie Charts",
  supported: true,
  supportLevel: "fallback",
  examples: [
    {
      title: "Browser Share",
      description: "Simple pie chart",
      code: `pie title Browser Market Share
    "Chrome" : 65
    "Safari" : 19
    "Firefox" : 4
    "Edge" : 4
    "Other" : 8`,
    },
  ],
};

const MINDMAP_DIAGRAMS: ExampleSection = {
  title: "Mindmaps",
  supported: true,
  supportLevel: "fallback",
  examples: [
    {
      title: "Project Brainstorm",
      description: "Hierarchical idea map",
      code: `mindmap
  root((Project))
    Frontend
      React
      TypeScript
      Tailwind
    Backend
      Node.js
      PostgreSQL
      Redis
    DevOps
      Docker
      CI/CD
      Monitoring`,
    },
  ],
};

const TIMELINE_DIAGRAMS: ExampleSection = {
  title: "Timeline",
  supported: true,
  supportLevel: "fallback",
  examples: [
    {
      title: "Company History",
      description: "Chronological events",
      code: `timeline
    title Company History
    2020 : Founded
         : First product launch
    2021 : Series A funding
         : 50 employees
    2022 : International expansion
         : 200 employees
    2023 : Series B funding
         : IPO preparation`,
    },
  ],
};

const GITGRAPH_DIAGRAMS: ExampleSection = {
  title: "Git Graph",
  supported: true,
  supportLevel: "fallback",
  examples: [
    {
      title: "Feature Branch",
      description: "Branching and merging",
      code: `gitGraph
    commit
    commit
    branch feature
    checkout feature
    commit
    commit
    checkout main
    merge feature
    commit`,
    },
  ],
};

const QUADRANT_DIAGRAMS: ExampleSection = {
  title: "Quadrant Chart",
  supported: true,
  supportLevel: "fallback",
  examples: [
    {
      title: "Priority Matrix",
      description: "Effort vs Impact",
      code: `quadrantChart
    title Priority Matrix
    x-axis Low Effort --> High Effort
    y-axis Low Impact --> High Impact
    quadrant-1 Do First
    quadrant-2 Schedule
    quadrant-3 Delegate
    quadrant-4 Eliminate
    Feature A: [0.3, 0.8]
    Feature B: [0.7, 0.9]
    Feature C: [0.2, 0.3]
    Feature D: [0.8, 0.2]`,
    },
  ],
};

// ─── Exports ────────────────────────────────────────────────────────────────

export const ALL_EXAMPLES: ExampleSection[] = [
  // Native: custom @drawhaus converters (editable elements with theme)
  FLOWCHART_BASICS,
  FLOWCHART_SUBGRAPHS,
  FLOWCHART_PATTERNS,
  CLASS_BASICS,
  CLASS_PATTERNS,
  SEQUENCE_BASICS,
  SEQUENCE_PATTERNS,
  // Fallback: @excalidraw/mermaid-to-excalidraw (SVG image, not editable)
  ENTITY_RELATIONSHIP,
  STATE_DIAGRAMS,
  GANTT_DIAGRAMS,
  PIE_DIAGRAMS,
  MINDMAP_DIAGRAMS,
  TIMELINE_DIAGRAMS,
  GITGRAPH_DIAGRAMS,
  QUADRANT_DIAGRAMS,
];

/** Flat list of all supported examples with their section title. */
export interface FlatExample {
  sectionTitle: string;
  example: Example;
}

export const FLAT_SUPPORTED_EXAMPLES: FlatExample[] = ALL_EXAMPLES
  .filter((s) => s.supported)
  .flatMap((s) => s.examples.map((e) => ({ sectionTitle: s.title, example: e })));

export const DEFAULT_CODE = FLOWCHART_BASICS.examples[0].code;
