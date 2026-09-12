# Qube

Qube is a modern, unified PostgreSQL developer platform and workspace. It brings together isolated per-project schemas, visual data management, an interactive SQL editor, auto-generated REST APIs, and **live real-time database change streams via WebSockets**.

## Overview

Qube bridges the gap between database administration, API generation, and real-time event distribution. Teams can organize work into organizations and projects, provision dedicated PostgreSQL schemas, shape tables visually, inspect and mutate data, execute SQL queries, consume instant REST endpoints, and stream `INSERT`, `UPDATE`, and `DELETE` events directly to client applications in real time.

```text
Organization
      ↓
Project (dedicated PostgreSQL schema & API keys)
      ↓
Tables and Schema Definitions
      ├── Visual Table Editor & Row Inspector
      ├── Monaco SQL Editor with Execution History
      ├── Auto-Generated REST Endpoints
      └── ⚡ Real-Time WebSocket Event Streaming (pg_notify)
```

## 📸 Screenshots

### ⚡ Real-Time Live Event Inspector
Stream database mutations in real time. Toggle triggers on any table and inspect live `INSERT`, `UPDATE`, and `DELETE` event feeds with full JSON payloads and change diffs.

![Qube Real-Time Event Inspector](./docs/screenshots/real-time.png)

### Dashboard
Manage organizations, projects, API keys, and workspace settings from a single view.

![Qube Dashboard](./docs/screenshots/bashboard.png)

### Table Editor
Visually inspect schema definitions, configure column types, defaults, and foreign keys, and manage table rows with inline editing.

![Qube Table Editor](./docs/screenshots/table-editor.png)

### SQL Editor
Execute raw queries against your project's isolated schema with syntax highlighting, performance metrics, and saved query history.

![Qube SQL Editor](./docs/screenshots/sql-editor.png)

### API Manager
Interactive documentation and client examples auto-derived from your project's database tables.

![Qube API Manager](./docs/screenshots/api-manager.png)

---

## Features

### ⚡ Real-Time Data Streaming
Transform PostgreSQL into a reactive, event-driven backend without external message brokers.

- **Zero-Lag Postgres Triggers**: Seamlessly injects PL/pgSQL triggers (`AFTER INSERT OR UPDATE OR DELETE`) directly into project schemas to capture row-level changes automatically.
- **Postgres `LISTEN` / `NOTIFY`**: Transmits structured mutation payloads (`type`, `table`, `record`, `oldRecord`, `projectId`, `timestamp`) over dedicated project channels using native PostgreSQL notification mechanisms.
- **WebSocket Gateway (`/realtime`)**: High-throughput NestJS Socket.IO gateway that maps PostgreSQL notification channels to project and table rooms.
- **Granular Table Toggles**: Enable or disable real-time streaming per table with a single toggle in the UI or via REST API endpoints (`POST/DELETE .../realtime/:tableName/enable`).
- **Interactive Event Inspector**: Monitor live database activity in real time with operation badges (green for `INSERT`, yellow for `UPDATE`, red for `DELETE`), relative timestamps, and expandable JSON payload diffs.
- **Secure Authentication**: WebSocket connections are authenticated using project JWT keys (`anonKey` or `serviceRoleKey`), isolating streams strictly by project scope.

#### Client-Side Integration Example
Frontend apps and microservices can subscribe to real-time table mutations using `socket.io-client`:

```typescript
import { io } from "socket.io-client";

// Connect to Qube Realtime namespace with project anon key
const socket = io("http://localhost:3000/realtime", {
  auth: { token: "YOUR_PROJECT_ANON_KEY" },
  transports: ["websocket", "polling"],
});

socket.on("connect", () => {
  console.log("Connected to Qube Realtime stream");
  // Subscribe to changes on the 'users' table
  socket.emit("realtime:subscribe", "users");
});

// Handle real-time database events
socket.on("realtime:event", (event) => {
  console.log(`[${event.type}] on ${event.table}:`, event.record);
  // event.type: 'INSERT' | 'UPDATE' | 'DELETE'
  // event.record: current row data
  // event.oldRecord: previous row data (on UPDATE / DELETE)
});

socket.on("realtime:error", (err) => {
  console.error("Realtime subscription error:", err);
});
```

### Organizations and projects

- Create organizations and isolate project workspaces.
- Invite team members via email, assign `admin` or `developer` roles, and manage permissions.
- Protect operations using cookie-based JWT authentication and organization-role guards.
- Automatically provision an isolated PostgreSQL schema and distinct project API keys (`anon` and `service_role`) upon project creation.

### PostgreSQL database workspace

- Browse tables in a project's schema and inspect columns, defaults, primary keys, and foreign-key relationships.
- Create and delete tables; add and drop columns.
- Support for `text`, `integer`, `bigint`, `boolean`, `timestamp`, `uuid`, `jsonb`, and `numeric` column types.
- Configure nullability, defaults, primary keys (including composite keys), and foreign-key constraints.
- Browse paginated rows and update row values by primary-key column directly from the Table Editor.

### SQL Editor

- Write and run queries directly against your isolated project schema context.
- View returned columns, rows, command metadata, execution duration, and error diagnostics.
- Store and retrieve the 50 most recent query-history entries per project.
- Safety guardrails: rejects multi-statement requests and prevents destructive database-level commands like `DROP DATABASE`, `DROP SCHEMA`, and `TRUNCATE`.

### Generated REST API

Each table created in a project's schema is automatically exposed through the project's REST interface without manual configuration.

For a table named `users`, Qube exposes:

```text
GET     /api/projects/:projectSlug/rest/users
POST    /api/projects/:projectSlug/rest/users
PATCH   /api/projects/:projectSlug/rest/users/:id
DELETE  /api/projects/:projectSlug/rest/users/:id
```

- `GET` accepts an anonymous project key and supports field selection, relational filtering (`eq`, `neq`, `gt`, `gte`, `lt`, `lte`, `like`, `ilike`, `is`), sorting, limit, and offset pagination.
- `POST`, `PATCH`, and `DELETE` endpoints are guarded by the project service-role key.

## Architecture

```text
                             ┌──────────────────────────────────────────────┐
                             │               Next.js Web App                │
                             │  Dashboard · Table Editor · Monaco SQL UI    │
                             │   API Explorer · Live Real-Time Inspector    │
                             └──────────────┬───────────────────────▲───────┘
                                            │ HTTP + Cookies        │ WebSockets
                                            ▼                       │ (/realtime)
                             ┌──────────────────────────────────────┴───────┐
                             │                  NestJS API                  │
                             │   Auth · Orgs · Projects · Table REST APIs   │
                             │       Realtime Gateway & Trigger Mgmt        │
                             └──────────────┬───────────────────────▲───────┘
                                            │ Direct SQL / ORM      │
                                            │ Drizzle               │ LISTEN / NOTIFY
                                            ▼                       │ (pg_notify)
                         ┌──────────────────────────────────────────┴───────┐
                         │       PostgreSQL (Neon Serverless Driver)        │
                         │    Application Metadata + Isolated Project       │
                         │             Schemas & Triggers                   │
                         └──────────────────────────────────────────────────┘
```

The backend stores application metadata—users, organizations, memberships, projects, and query history—in PostgreSQL using Drizzle ORM. Each project operates inside its own PostgreSQL schema, which powers the Table Editor, SQL Editor, generated REST APIs, and event-trigger pipelines.

## Tech stack

| Area | Technologies |
| --- | --- |
| Frontend | Next.js 16, React 19, TypeScript, Tailwind CSS 4, Radix UI, TanStack Table, Monaco Editor, Socket.IO Client |
| Backend | NestJS 11, Express platform, Socket.IO Gateway, WebSocket (`ws`), TypeScript |
| Real-Time Engine | PostgreSQL `LISTEN` / `NOTIFY`, PL/pgSQL Triggers, Neon WebSocket Driver |
| Database | PostgreSQL via the Neon serverless driver |
| Data access and migrations | Drizzle ORM and Drizzle Kit |
| Authentication | JWT, HTTP cookies, bcrypt; Google and GitHub OAuth flows |
| Validation | class-validator / class-transformer (API), Zod and React Hook Form (web) |
| Email | Resend organization invitations |
| Tooling | ESLint, Prettier, Jest, Dockerfiles for web and API, Wrangler deployment |
| Workspace | pnpm workspaces with shared `@qube/constants` and `@qube/types` packages |

## Project structure

```text
.
├── apps/
│   ├── api/
│   │   ├── drizzle/                 # Drizzle migrations and metadata
│   │   ├── src/
│   │   │   ├── auth/                # Authentication & OAuth strategies
│   │   │   ├── db/                  # Drizzle database connection and schema
│   │   │   ├── members/             # Memberships and invitations
│   │   │   ├── orgs/                # Organization management
│   │   │   ├── project-api/         # Dynamic REST endpoints per table
│   │   │   ├── projects/            # Project & schema provisioning
│   │   │   ├── real-time/           # WebSocket gateway, LISTEN/NOTIFY & triggers
│   │   │   ├── sql-editor/          # Query execution and history
│   │   │   └── table-editor/        # Schema inspection, DDL & row CRUD
│   │   └── test/
│   └── web/
│       ├── src/app/                 # Next.js App Router pages & layouts
│       ├── src/components/          # UI primitives and shared components
│       ├── src/features/            # Organizations, projects, tables, SQL, Realtime
│       │   └── realtime/            # Realtime dashboard client and streaming hooks
│       └── public/
├── docs/
│   └── screenshots/                 # Application screenshots & UI previews
├── packages/
│   ├── constants/                   # Shared event names, roles, and tokens
│   └── types/                       # Shared TypeScript interfaces & DTOs
├── package.json
├── pnpm-workspace.yaml
└── README.md
```

## Getting started

### Prerequisites

- Node.js (v20+ LTS recommended).
- pnpm (`pnpm install -g pnpm`).
- PostgreSQL database reachable via connection string (Neon or standard PostgreSQL).

```bash
git clone <repository-url>
cd Qube
pnpm install
```

### Environment configuration

Configure environment variables for both the API and Web applications.

`apps/api/.env`:

```text
PORT=3000
WEB_URL=http://localhost:3001
API_URL=http://localhost:3000/api
DATABASE_URL=postgresql://user:pass@host/db?sslmode=require
REALTIME_DATABASE_URL=postgresql://user:pass@host/db?sslmode=require # Optional direct URL (unpooled) for LISTEN/NOTIFY
JWT_ACCESS_SECRET=your_jwt_access_secret
JWT_REFRESH_SECRET=your_jwt_refresh_secret
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=http://localhost:3000/api/auth/google/callback
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
GITHUB_CALLBACK_URL=http://localhost:3000/api/auth/github/callback
RESEND_API_KEY=your_resend_api_key
INVITE_SECRET=your_invite_secret
PROJECT_JWT_SECRET=your_project_jwt_secret
```

> **Note on `REALTIME_DATABASE_URL`**: When using pooled connections (such as Neon Connection Pooler or PgBouncer in transaction mode), PostgreSQL `LISTEN`/`NOTIFY` requires a direct, unpooled connection. Qube will automatically fall back to `DATABASE_URL` (stripping `-pooler` if present) or use `REALTIME_DATABASE_URL` if explicitly set.

`apps/web/.env`:

```text
NEXT_PUBLIC_API_URL=http://localhost:3000/api
API_URL=http://localhost:3000/api
```

Apply database migrations:

```bash
pnpm --filter api db:migrate
```

Start the development servers:

```bash
pnpm dev
```

Or run them individually:

```bash
pnpm dev:api   # NestJS API on http://localhost:3000
pnpm dev:web   # Next.js web application on http://localhost:3001
```

## Development commands

| Command | Description |
| --- | --- |
| `pnpm dev` | Start the API and web development servers concurrently. |
| `pnpm dev:api` | Start the NestJS API in watch mode. |
| `pnpm dev:web` | Start the Next.js app on port 3001. |
| `pnpm --filter api build` | Build the API for production. |
| `pnpm --filter web build` | Build the Next.js web app. |
| `pnpm --filter api lint` | Run API ESLint with auto-fix. |
| `pnpm --filter web lint` | Run web ESLint checks. |
| `pnpm --filter api test` | Run API unit tests. |
| `pnpm --filter api test:e2e` | Run API end-to-end tests. |
| `pnpm --filter api db:generate` | Generate Drizzle migrations from schema changes. |
| `pnpm --filter api db:migrate` | Apply pending Drizzle migrations. |
| `pnpm --filter api db:push` | Push schema changes directly to the database. |
| `pnpm --filter api db:studio` | Launch Drizzle Studio GUI. |
| `pnpm deploy:web` | Deploy web frontend via Wrangler. |

## Core workflow

1. **Sign Up & Workspace Setup**: Register or authenticate via OAuth, then create an organization.
2. **Project Provisioning**: Create a project; Qube isolates a dedicated PostgreSQL schema and issues project `anon` and `service_role` keys.
3. **Design Schema**: Use the visual Table Editor to create tables, columns, primary keys, and foreign keys.
4. **Data Management**: Browse, sort, and perform row-level edits in the Table Editor.
5. **Run Queries**: Use the Monaco SQL Editor to run arbitrary SQL statements against the project schema and review query execution logs.
6. **Enable Real-Time Streaming**: Navigate to the **Realtime** tab, toggle listening on desired tables, and observe live change streams as rows are created, updated, or deleted.
7. **Consume REST APIs**: Use auto-generated REST endpoints with your project keys or subscribe frontend clients to the `/realtime` WebSocket gateway.

## Security considerations

- **Secret Isolation**: Store `DATABASE_URL`, JWT secrets, OAuth credentials, Resend keys, and the project `service_role` key securely in server environment variables.
- **Key Roles**: The `anon` key is designed for public/client use (reads and real-time client subscriptions). The `service_role` key bypasses read-only restrictions and must remain server-side.
- **SQL Execution Safety**: SQL execution runs in authenticated project context. Qube restricts multi-statements and blocks destructive schema-wide commands (`DROP SCHEMA`, `DROP DATABASE`, `TRUNCATE`).
- **WebSocket Project Scoping**: Real-time subscriptions are authenticated via project keys and bound to strict project rooms to prevent cross-tenant data leakage.

## Roadmap

### Available today
- Organization and team member management with role-based access
- Isolated per-project PostgreSQL schemas
- Visual table, column, and constraint management
- Row inspection and inline primary-key updates
- Monaco SQL Editor with execution timing and history
- ⚡ **Real-Time change feeds with Postgres triggers and WebSocket streaming**
- ⚡ **Live Real-Time Event Inspector in the dashboard**
- Auto-generated table REST endpoints and documentation

### Potential improvements
- API key rotation and fine-grained scopes
- Row-Level Security (RLS) integration for client queries and real-time feeds
- OpenAPI (Swagger) export for project APIs
- WebSocket presence and broadcast messaging channels
- Rate limiting and usage analytics
- Saved SQL snippets and intelligent query autocomplete

## Contributing

Contributions are welcome! Please ensure that your changes adhere to the pnpm workspace conventions:

```bash
pnpm --filter web lint
pnpm --filter api lint
pnpm --filter api test
```

If your change affects the database schema, generate and include the relevant Drizzle migration under `apps/api/drizzle/`. Do not add credentials or other secrets to commits.

## License

MIT / Private (see package descriptors).
