export interface MermaidTemplate {
  id: string;
  name: string;
  description: string;
  code: string;
  category: string;
}

export const mermaidTemplates: MermaidTemplate[] = [
  {
    id: 'flowchart-basic',
    name: 'Basic Flowchart',
    description: 'Simple flowchart template',
    category: 'Flowchart',
    code: `graph TD
    A[Start] --> B{Decision}
    B -->|Yes| C[Execute Action A]
    B -->|No| D[Execute Action B]
    C --> E[End]
    D --> E`,
  },
  {
    id: 'flowchart-lr',
    name: 'Horizontal Flowchart',
    description: 'Left to right flowchart',
    category: 'Flowchart',
    code: `graph LR
    A[Input] --> B[Process]
    B --> C[Validate]
    C -->|Pass| D[Output]
    C -->|Fail| E[Error Handling]
    E --> B`,
  },
  {
    id: 'sequence-basic',
    name: 'Basic Sequence Diagram',
    description: 'Simple sequence diagram template',
    category: 'Sequence',
    code: `sequenceDiagram
    participant A as User
    participant B as System
    participant C as Database

    A->>B: Send Request
    B->>C: Query Data
    C-->>B: Return Result
    B-->>A: Response Data`,
  },

  {
    id: 'state-basic',
    name: 'Basic State Diagram',
    description: 'Simple state diagram template',
    category: 'State',
    code: `stateDiagram-v2
    [*] --> Pending
    Pending --> Processing : Start Processing
    Processing --> Completed : Process Complete
    Processing --> Failed : Process Failed
    Failed --> Pending : Retry
    Completed --> [*]`,
  },
  {
    id: 'er-basic',
    name: 'Basic ER Diagram',
    description: 'Simple entity relationship diagram template',
    category: 'ER Diagram',
    code: `erDiagram
    USER {
        int id PK
        string name
        string email
        date created_at
    }

    ORDER {
        int id PK
        int user_id FK
        decimal amount
        date order_date
    }

    USER ||--o{ ORDER : places`,
  },

  {
    id: 'pie-basic',
    name: 'Basic Pie Chart',
    description: 'Simple pie chart template',
    category: 'Pie Chart',
    code: `pie title Project Progress Distribution
    "Completed" : 45
    "In Progress" : 30
    "Pending" : 20
    "Cancelled" : 5`,
  },

  {
    id: 'programming-api-flow',
    name: 'API Request Flow',
    description: 'Shows API request flow between client, backend and database',
    category: 'Programming',
    code: `sequenceDiagram
    participant Client as Client
    participant Server as Backend Service
    participant Auth as Auth Service
    participant DB as Database

    Client->>Server: GET /api/data
    Server->>Auth: Verify Token
    Auth-->>Server: Token Valid
    Server->>DB: Query Data
    DB-->>Server: Return Data
    Server-->>Client: 200 OK (Data)`,
  },
  {
    id: 'programming-microservice-arch',
    name: 'Microservice Architecture',
    description: 'A typical microservice architecture example',
    category: 'Programming',
    code: `graph TD
    subgraph Client Side
        A[Client App/Web]
    end
    subgraph Backend Services
        B(API Gateway)
        subgraph Services
            C[User Service]
            D[Order Service]
            E[Product Service]
        end
        subgraph Databases
            F[(User DB)]
            G[(Order DB)]
            H[(Product DB)]
        end
    end
    A --> B
    B --> C
    B --> D
    B --> E
    C --> F
    D --> G
    E --> H`,
  },
  {
    id: 'programming-data-flow',
    name: 'Redux/Vuex Data Flow',
    description: 'Frontend state management (like Redux/Vuex) data flow model',
    category: 'Programming',
    code: `graph TD
    A[View] -- dispatch --> B(Action)
    B -- async operation --> C(API)
    C -- response --> B
    B -- commit --> D(Mutation/Reducer)
    D -- update --> E(State)
    E -- render --> A`,
  },
  {
    id: 'programming-db-schema',
    name: 'Database Schema',
    description: 'A simple e-commerce database schema ER diagram',
    category: 'Programming',
    code: `erDiagram
    CUSTOMER ||--o{ ORDER : places
    ORDER ||--|{ LINE-ITEM : contains
    CUSTOMER {
        int id PK
        string name
        string email
    }
    ORDER {
        int id PK
        int customer_id FK
        datetime created_at
    }
    LINE-ITEM {
        int id PK
        int order_id FK
        int product_id FK
        int quantity
    }
    PRODUCT ||--o{ LINE-ITEM : \"is part of\"
    PRODUCT {
        int id PK
        string name
        float price
    }`,
  },
  {
    id: 'gantt-basic',
    name: 'Basic Gantt Chart',
    description: 'Simple gantt chart template',
    category: 'Gantt Chart',
    code: `gantt
    title Project Timeline
    dateFormat  YYYY-MM-DD
    section Design Phase
    Requirements Analysis    :done,    des1, 2024-01-01,2024-01-05
    UI Design               :active,  des2, 2024-01-06, 3d
    section Development Phase
    Frontend Development    :         dev1, after des2, 5d
    Backend Development     :         dev2, after des2, 5d
    Testing                 :         test1, after dev1, 2d`,
  },
];

export const templateCategories = [
  'All',
  'Flowchart',
  'Sequence',
  'State',
  'ER Diagram',
  'Pie Chart',
  'Programming',
  'Gantt Chart',
];
