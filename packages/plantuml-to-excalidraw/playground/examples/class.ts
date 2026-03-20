export interface Example {
  title: string;
  description: string;
  code: string;
}

export interface ExampleSection {
  title: string;
  examples: Example[];
}

export const CLASS_EXAMPLES: ExampleSection[] = [
  {
    title: "Basics",
    examples: [
      {
        title: "Simple Class",
        description: "Class with attributes and methods",
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
    ],
  },
  {
    title: "Relationships",
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
        title: "Dependencies",
        description: "Directed associations and dependencies",
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
  },
  {
    title: "Interfaces & Enums",
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
    ],
  },
  {
    title: "Real-World Patterns",
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
    ],
  },
];

export const DEFAULT_CODE = CLASS_EXAMPLES[0].examples[0].code;
