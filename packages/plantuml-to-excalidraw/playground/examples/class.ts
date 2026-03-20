export interface Example {
  title: string;
  description: string;
  code: string;
}

export interface ExampleSection {
  title: string;
  supported: boolean;
  examples: Example[];
}

// ─── Supported: Class Diagrams ───────────────────────────────────────────────

const CLASS_BASICS: ExampleSection = {
  title: "Class Diagrams — Basics",
  supported: true,
  examples: [
    {
      title: "Simple Class",
      description: "Attributes and methods with visibility",
      code: `@startuml
class User {
  +name: String
  -email: String
  #age: int
  +login(): boolean
  +logout(): void
  -validateEmail(): boolean
}
@enduml`,
    },
    {
      title: "Multiple Classes",
      description: "Several independent classes",
      code: `@startuml
class Product {
  +name: String
  +price: double
  +getDiscount(): double
}
class Category {
  +name: String
  +description: String
}
class Review {
  +rating: int
  +comment: String
  +date: Date
}
@enduml`,
    },
    {
      title: "Fields & Methods Shorthand",
      description: "Inline member declarations",
      code: `@startuml
Object <|-- ArrayList
Object : equals()
ArrayList : Object[] elementData
ArrayList : size()
@enduml`,
    },
  ],
};

const CLASS_RELATIONSHIPS: ExampleSection = {
  title: "Class Diagrams — Relationships",
  supported: true,
  examples: [
    {
      title: "Inheritance",
      description: "Parent-child class hierarchy",
      code: `@startuml
class Animal {
  +name: String
  +age: int
  +speak(): void
}
class Dog {
  +breed: String
  +fetch(): void
}
class Cat {
  +indoor: boolean
  +purr(): void
}
class Bird {
  +canFly: boolean
  +sing(): void
}
Dog --|> Animal
Cat --|> Animal
Bird --|> Animal
@enduml`,
    },
    {
      title: "Composition & Aggregation",
      description: "Strong and weak ownership",
      code: `@startuml
class Car {
  +model: String
  +year: int
  +start(): void
}
class Engine {
  +horsepower: int
  +type: String
  +run(): void
}
class Wheel {
  +size: int
  +pressure: double
}
class Driver {
  +name: String
  +license: String
}
Car *-- Engine : contains
Car *-- Wheel
Car o-- Driver : driven by
@enduml`,
    },
    {
      title: "Dependencies & Associations",
      description: "Directed associations and dotted dependencies",
      code: `@startuml
class Controller {
  +handleRequest(): void
}
class Service {
  +process(): void
}
class Repository {
  +find(): Object
  +save(): void
}
class Logger {
  +log(): void
}
Controller --> Service : uses
Service --> Repository : queries
Controller ..> Logger : depends on
Service ..> Logger : depends on
@enduml`,
    },
  ],
};

const CLASS_INTERFACES_ENUMS: ExampleSection = {
  title: "Class Diagrams — Interfaces & Enums",
  supported: true,
  examples: [
    {
      title: "Interface Implementation",
      description: "Classes implementing interfaces",
      code: `@startuml
interface Serializable {
  +serialize(): String
  +deserialize(data: String): void
}
interface Comparable {
  +compareTo(other: Object): int
}
class Document {
  +title: String
  +content: String
  +serialize(): String
  +deserialize(data: String): void
  +compareTo(other: Object): int
}
Document ..|> Serializable
Document ..|> Comparable
@enduml`,
    },
    {
      title: "Enum with Relations",
      description: "Enums connected to classes",
      code: `@startuml
enum OrderStatus {
  PENDING
  PROCESSING
  SHIPPED
  DELIVERED
  CANCELLED
}
enum PaymentMethod {
  CREDIT_CARD
  DEBIT_CARD
  PAYPAL
  CRYPTO
}
class Order {
  +id: int
  +total: double
  +status: OrderStatus
  +payment: PaymentMethod
}
Order --> OrderStatus
Order --> PaymentMethod
@enduml`,
    },
    {
      title: "Abstract Classes",
      description: "Abstract base with concrete implementations",
      code: `@startuml
abstract class Shape {
  +color: String
  +{abstract} area(): double
  +{abstract} perimeter(): double
}
class Circle {
  +radius: double
  +area(): double
  +perimeter(): double
}
class Rectangle {
  +width: double
  +height: double
  +area(): double
  +perimeter(): double
}
class Triangle {
  +a: double
  +b: double
  +c: double
  +area(): double
  +perimeter(): double
}
Circle --|> Shape
Rectangle --|> Shape
Triangle --|> Shape
@enduml`,
    },
    {
      title: "Inheritance & Interfaces Mix",
      description: "Abstract, interface, enum, and concrete classes",
      code: `@startuml
abstract class AbstractList
abstract AbstractCollection
interface List
interface Collection

List <|-- AbstractList
Collection <|-- AbstractCollection
Collection <|- List
AbstractCollection <|- AbstractList
AbstractList <|-- ArrayList

class ArrayList {
  Object[] elementData
  size()
}

enum TimeUnit {
  DAYS
  HOURS
  MINUTES
}
@enduml`,
    },
  ],
};

const CLASS_PATTERNS: ExampleSection = {
  title: "Class Diagrams — Real-World Patterns",
  supported: true,
  examples: [
    {
      title: "E-Commerce Domain",
      description: "Online store class model",
      code: `@startuml
class Customer {
  +id: int
  +name: String
  +email: String
  +register(): void
  +placeOrder(): Order
}
class Order {
  +id: int
  +date: Date
  +total: double
  +getStatus(): String
}
class OrderLine {
  +quantity: int
  +unitPrice: double
  +getSubtotal(): double
}
class Product {
  +name: String
  +price: double
  +stock: int
}
class Payment {
  +amount: double
  +method: String
  +process(): boolean
}
Customer --> Order : places
Order *-- OrderLine
OrderLine --> Product
Order --> Payment : paid via
@enduml`,
    },
    {
      title: "Observer Pattern",
      description: "Classic design pattern",
      code: `@startuml
interface Observer {
  +update(event: Event): void
}
interface Subject {
  +attach(o: Observer): void
  +detach(o: Observer): void
  +notify(): void
}
class EventBus {
  -observers: List
  +attach(o: Observer): void
  +detach(o: Observer): void
  +notify(): void
}
class Logger {
  +update(event: Event): void
}
class Analytics {
  +update(event: Event): void
}
class Notifier {
  +update(event: Event): void
}
EventBus ..|> Subject
Logger ..|> Observer
Analytics ..|> Observer
Notifier ..|> Observer
EventBus --> Observer : notifies
@enduml`,
    },
    {
      title: "MVC Architecture",
      description: "Model-View-Controller pattern",
      code: `@startuml
class Model {
  -data: Map
  +getData(): Object
  +setData(key: String, value: Object): void
  +validate(): boolean
}
class View {
  -template: String
  +render(data: Object): String
  +update(): void
}
class Controller {
  +handleGet(): Response
  +handlePost(): Response
  +handleDelete(): Response
}
class Router {
  +route(path: String): Controller
  +addRoute(path: String, ctrl: Controller): void
}
Controller --> Model : reads/writes
Controller --> View : renders
Router --> Controller : dispatches
@enduml`,
    },
    {
      title: "Repository Pattern",
      description: "Data access abstraction layer",
      code: `@startuml
interface Repository {
  +findById(id: int): Entity
  +findAll(): List
  +save(entity: Entity): void
  +delete(id: int): void
}
class UserRepository {
  -db: Database
  +findById(id: int): User
  +findAll(): List
  +save(entity: User): void
  +delete(id: int): void
}
class InMemoryUserRepository {
  -store: Map
  +findById(id: int): User
  +findAll(): List
  +save(entity: User): void
  +delete(id: int): void
}
class UserService {
  -repo: Repository
  +getUser(id: int): User
  +createUser(data: Object): User
}
UserRepository ..|> Repository
InMemoryUserRepository ..|> Repository
UserService --> Repository : uses
@enduml`,
    },
  ],
};

// ─── Unsupported Diagram Types ───────────────────────────────────────────────

const SEQUENCE_DIAGRAMS: ExampleSection = {
  title: "Sequence Diagrams",
  supported: false,
  examples: [
    {
      title: "Basic Messages",
      description: "Request-response between participants",
      code: `@startuml
Alice -> Bob: Authentication Request
Bob --> Alice: Authentication Response
Alice -> Bob: Another authentication Request
Alice <-- Bob: Another authentication Response
@enduml`,
    },
    {
      title: "Participant Types",
      description: "Actor, boundary, control, entity, database, queue",
      code: `@startuml
participant Participant as Foo
actor Actor as Foo1
boundary Boundary as Foo2
control Control as Foo3
entity Entity as Foo4
database Database as Foo5
collections Collections as Foo6
queue Queue as Foo7
Foo -> Foo1 : To actor
Foo -> Foo2 : To boundary
Foo -> Foo3 : To control
Foo -> Foo4 : To entity
Foo -> Foo5 : To database
Foo -> Foo6 : To collections
Foo -> Foo7 : To queue
@enduml`,
    },
  ],
};

const USE_CASE_DIAGRAMS: ExampleSection = {
  title: "Use Case Diagrams",
  supported: true,
  examples: [
    {
      title: "Restaurant System",
      description: "Actors and use cases with packages",
      code: `@startuml
left to right direction
actor Guest as g
package Restaurant {
  usecase "Eat Food" as UC1
  usecase "Pay for Food" as UC2
  usecase "Drink" as UC3
  usecase "Review" as UC4
}
g --> UC1
g --> UC2
g --> UC3
@enduml`,
    },
    {
      title: "Include & Extend",
      description: "Relationships with stereotypes",
      code: `@startuml
actor User
usecase Login
usecase Authenticate
usecase SSO
User --> Login
Login ..> Authenticate : <<include>>
SSO ..> Login : <<extend>>
@enduml`,
    },
    {
      title: "Online Store",
      description: "System boundary with multiple actors",
      code: `@startuml
left to right direction
actor Customer
actor Admin
rectangle "Online Store" {
  usecase "Browse Products" as UC1
  usecase "Place Order" as UC2
  usecase "Manage Inventory" as UC3
  usecase "Process Payment" as UC4
}
Customer --> UC1
Customer --> UC2
UC2 ..> UC4 : <<include>>
Admin --> UC3
@enduml`,
    },
  ],
};

const OBJECT_DIAGRAMS: ExampleSection = {
  title: "Object Diagrams",
  supported: true,
  examples: [
    {
      title: "Object with Fields",
      description: "Named object instance with values",
      code: `@startuml
object user {
  name = "Dummy"
  id = 123
}
@enduml`,
    },
    {
      title: "Map Table",
      description: "Key-value mapping",
      code: `@startuml
map CapitalCity {
  UK => London
  USA => Washington
  Germany => Berlin
}
@enduml`,
    },
  ],
};

const ACTIVITY_DIAGRAMS: ExampleSection = {
  title: "Activity Diagrams",
  supported: false,
  examples: [
    {
      title: "Simple Flow",
      description: "Start, actions, and stop",
      code: `@startuml
start
:Hello world;
:This is defined on
several **lines**;
stop
@enduml`,
    },
    {
      title: "Conditional",
      description: "If/else branching",
      code: `@startuml
start
if (Graphviz installed?) then (yes)
  :process all diagrams;
else (no)
  :process only
  __sequence__ and __activity__ diagrams;
endif
stop
@enduml`,
    },
    {
      title: "Parallel Fork",
      description: "Concurrent activities with fork/join",
      code: `@startuml
start
fork
  :action 1;
fork again
  :action 2;
end fork
stop
@enduml`,
    },
  ],
};

const COMPONENT_DIAGRAMS: ExampleSection = {
  title: "Component Diagrams",
  supported: false,
  examples: [
    {
      title: "Packages & Nodes",
      description: "Components in packages, nodes, clouds, databases",
      code: `@startuml
package "Some Group" {
  HTTP - [First Component]
  [Another Component]
}

node "Other Groups" {
  FTP - [Second Component]
  [First Component] --> FTP
}

cloud {
  [Example 1]
}

database "MySql" {
  folder "This is my folder" {
    [Folder 3]
  }
  frame "Foo" {
    [Frame 4]
  }
}

[Another Component] --> [Example 1]
[Example 1] --> [Folder 3]
[Folder 3] --> [Frame 4]
@enduml`,
    },
  ],
};

const DEPLOYMENT_DIAGRAMS: ExampleSection = {
  title: "Deployment Diagrams",
  supported: false,
  examples: [
    {
      title: "Nodes & Links",
      description: "Deployment nodes with different link styles",
      code: `@startuml
node node1
node node2
node node3
node node4
node1 -- node2 : label1
node1 .. node3 : label2
node1 ~~ node4 : label3
@enduml`,
    },
    {
      title: "Nested Containers",
      description: "Cloud, node, and stack nesting",
      code: `@startuml
cloud vpc {
  node ec2 {
    stack stack
  }
}
@enduml`,
    },
  ],
};

const STATE_DIAGRAMS: ExampleSection = {
  title: "State Diagrams",
  supported: false,
  examples: [
    {
      title: "Basic States",
      description: "States and transitions with labels",
      code: `@startuml
[*] --> State1
State1 --> [*]
State1 : this is a string
State1 : this is another string

State1 -> State2
State2 --> [*]
@enduml`,
    },
    {
      title: "Composite States",
      description: "Nested state machines",
      code: `@startuml
[*] --> NotShooting

state NotShooting {
  [*] --> Idle
  Idle --> Configuring : EvConfig
  Configuring --> Idle : EvConfig
}

state Configuring {
  [*] --> NewValueSelection
  NewValueSelection --> NewValuePreview : EvNewValue
  NewValuePreview --> NewValueSelection : EvNewValueRejected
  NewValuePreview --> NewValueSelection : EvNewValueSaved
}
@enduml`,
    },
    {
      title: "Fork & Join",
      description: "Parallel state transitions",
      code: `@startuml
state fork_state <<fork>>
[*] --> fork_state
fork_state --> State2
fork_state --> State3

state join_state <<join>>
State2 --> join_state
State3 --> join_state
join_state --> State4
State4 --> [*]
@enduml`,
    },
  ],
};

const TIMING_DIAGRAMS: ExampleSection = {
  title: "Timing Diagrams",
  supported: false,
  examples: [
    {
      title: "Robust & Concise",
      description: "State changes over time",
      code: `@startuml
robust "Web Browser" as WB
concise "Web User" as WU

@0
WU is Idle
WB is Idle

@100
WU is Waiting
WB is Processing

@300
WB is Waiting
@enduml`,
    },
    {
      title: "Clock & Binary Signals",
      description: "Digital timing with clock and enable",
      code: `@startuml
clock clk with period 1
binary "Enable" as EN

@0
EN is low

@5
EN is high

@10
EN is low
@enduml`,
    },
  ],
};

// ─── Exports ─────────────────────────────────────────────────────────────────

export const ALL_EXAMPLES: ExampleSection[] = [
  // Supported
  CLASS_BASICS,
  CLASS_RELATIONSHIPS,
  CLASS_INTERFACES_ENUMS,
  CLASS_PATTERNS,
  OBJECT_DIAGRAMS,
  USE_CASE_DIAGRAMS,
  // Unsupported
  SEQUENCE_DIAGRAMS,
  ACTIVITY_DIAGRAMS,
  COMPONENT_DIAGRAMS,
  DEPLOYMENT_DIAGRAMS,
  STATE_DIAGRAMS,
  TIMING_DIAGRAMS,
];

/** @deprecated Use ALL_EXAMPLES instead */
export const CLASS_EXAMPLES = ALL_EXAMPLES;

export const DEFAULT_CODE = CLASS_BASICS.examples[0].code;
