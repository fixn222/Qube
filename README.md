# Qube

Qube is a PostgreSQL developer workspace for managing organizations and projects, designing schemas, working with data, running SQL, exposing table REST endpoints, and streaming database changes in real time.

The repository is a pnpm monorepo. It contains a Next.js dashboard, a NestJS API, shared TypeScript packages, and the `qube-js` client SDK. Qube stores application metadata and project data in PostgreSQL. Each Qube project receives an isolated PostgreSQL schema.

## Contents

- [Product screenshots](#product-screenshots)
- [Capabilities](#capabilities)
- [Architecture](#architecture)
- [Repository layout](#repository-layout)
- [Developer setup](#developer-setup)
- [Environment variables](#environment-variables)
- [Run Qube with Docker](#run-qube-with-docker)
- [Database development and migrations](#database-development-and-migrations)
- [Application and SDK development](#application-and-sdk-development)
- [SDK guide](SDK.md)
- [Commands](#commands)
- [Testing and verification](#testing-and-verification)
- [Security notes](#security-notes)
- [Contributing](#contributing)

## Product screenshots

The images below are stored in [`docs/screenshots/`](docs/screenshots/) and cover the available project workflows.

### Project overview

See project health, database table count, recent activity, and shortcuts to common tools.

![Qube project overview](docs/screenshots/project-overview.png)

### Database Explorer

Explore tables and their columns in a visual schema view.

![Qube Database Explorer](docs/screenshots/er.png)

### Table editor

Browse table rows and inspect their columns.

![Qube table editor](docs/screenshots/table.png)

### SQL editor

Write project-scoped SQL and run queries.

![Qube SQL editor](docs/screenshots/sql.png)

### API explorer

Review generated table endpoints, HTTP methods, and project API keys.

![Qube API explorer](docs/screenshots/api.png)

### Realtime

Manage table subscriptions and watch database changes arrive live.

![Qube realtime table subscriptions](docs/screenshots/realtime3.png)

The analytics view also summarizes realtime connections, subscriptions, and event deliveries.

![Qube realtime analytics](docs/screenshots/realtime1.png)

### Storage

Browse project buckets and the objects they contain.

![Qube project storage](docs/screenshots/storage.png)

### Analytics and performance

Review instrumented API activity, outcomes, latency, and recent events over a selected time range.

![Qube analytics overview](docs/screenshots/dashboard.png)

Inspect API and SQL latency percentiles, request volume, and slow query fingerprints.

![Qube performance and latency](docs/screenshots/performence.png)

When adding screenshots, place sanitized PNG or WebP files in `docs/screenshots/`, use descriptive filenames, and remove personal data, tokens, email addresses, and database credentials before committing them.

## Capabilities

- **Organizations and membership:** create organizations, invite members, and assign organization roles.
- **Project isolation:** each project gets its own PostgreSQL schema and separate anonymous and service-role project keys.
- **Schema workspace and ER diagram:** inspect tables and relationships in a visual database explorer; view columns, keys, indexes, estimated row counts, and suggested relationships; create tables and columns; manage supported constraints and defaults.
- **Table editor:** browse paginated rows and update data by primary key.
- **SQL editor:** run project-scoped SQL and review execution results, timing, errors, and query history.
- **Generated REST API:** access project tables through authenticated REST routes without writing a controller for each table.
- **Realtime:** enable table triggers and stream `INSERT`, `UPDATE`, and `DELETE` events through a Socket.IO gateway.
- **Storage:** manage project buckets and objects through the API and optional UploadThing integration.
- **Analytics and Observatory:** review instrumented API, SQL, and realtime activity, including request volume, outcomes, latency, slow query fingerprints, and recent events across selectable time ranges.
- **JavaScript SDK:** query project REST endpoints, listen for realtime events, and use storage helpers with [`qube-js`](packages/qube-js/README.md).

## Architecture

```mermaid
flowchart TB
  subgraph Compose[Docker Compose deployment]
    Migrate[One-shot migration job]
    Web[Next.js dashboard :3001]
    API[NestJS API :3000]
    Migrate -->|success required| API
    Migrate -->|success required| Web
  end
  Browser[Browser / qube-js] -->|HTTP and cookies| Web
  Browser -->|REST| API
  Browser -->|Socket.IO /realtime| API
  Web -->|server-side HTTP| API
  API -->|Neon HTTP driver / Drizzle| DB[(External PostgreSQL / Neon)]
  API -->|pg LISTEN / NOTIFY| DB
```

The app container runs the web server and API under a small process supervisor. PostgreSQL is external; Compose does not start a database container. The Compose `migrate` service runs once before the app service. It uses the existing Drizzle SQL migration files, logs connection or SQL errors, and takes a PostgreSQL advisory lock to serialize migration jobs.

The API's application data access uses Drizzle ORM and the Neon serverless driver. The migration runner and realtime listener use PostgreSQL connections through `pg`. Realtime notifications are emitted by PostgreSQL triggers and delivered through `LISTEN` / `NOTIFY` to the Socket.IO gateway.

### Main application routes

The API uses the `/api` global prefix.

| Purpose | Route examples |
| --- | --- |
| Health | `GET /api/health` |
| Authentication | `/api/auth/register`, `/api/auth/login`, `/api/auth/me` |
| Organizations | `/api/orgs` |
| Projects | `/api/orgs/:orgSlug/projects` |
| Project table REST | `/api/projects/:projectSlug/rest/:table` |
| Table management | `/api/orgs/:orgSlug/projects/:projectSlug/tables` |
| SQL editor | `/api/orgs/:orgSlug/projects/:projectSlug/sql` |
| Realtime controls | `/api/orgs/:orgSlug/projects/:projectSlug/realtime/:tableName/enable` |
| Storage | Project and organization-scoped bucket and object routes |

Project REST reads accept a project key. Writes require a service-role project key. Dashboard routes use the user's authentication cookie and organization membership.

## Repository layout

```text
.
├── apps/
│   ├── api/
│   │   ├── drizzle/                 # SQL migrations, snapshots, and journal
│   │   ├── src/
│   │   │   ├── analytics/            # Project activity and schema analytics
│   │   │   ├── auth/                 # Password, cookie, JWT, and OAuth flows
│   │   │   ├── db/schema/            # Drizzle metadata schema definitions
│   │   │   ├── members/              # Organization membership and invites
│   │   │   ├── orgs/                 # Organization endpoints and services
│   │   │   ├── project-api/          # Dynamic project table REST API
│   │   │   ├── projects/             # Project and schema provisioning
│   │   │   ├── real-time/            # Triggers, listener, and Socket.IO gateway
│   │   │   ├── schema-introspection/ # Project schema inspection
│   │   │   ├── sql-editor/           # SQL execution and history
│   │   │   ├── storage/              # Buckets and objects
│   │   │   └── table-editor/         # Table, column, and row operations
│   │   └── test/                     # API end-to-end tests
│   └── web/
│       └── src/
│           ├── app/                  # Next.js App Router pages
│           ├── components/           # Shared UI components
│           ├── features/             # Dashboard feature modules
│           └── lib/                  # Browser and server helpers
├── docs/
│   ├── reports/                      # Engineering notes and reports
│   └── screenshots/                  # README and product screenshots
├── packages/
│   ├── constants/                    # Shared constants
│   ├── qube-js/                      # JavaScript SDK and its guide
│   └── types/                        # Shared TypeScript types
├── scripts/
│   ├── qube                         # Self-host install and lifecycle CLI
│   ├── run-qube-container.cjs       # App and migration process supervisor
│   └── run-qube-migrations.cjs      # Locked migration runner with error output
├── docker-compose.yml
├── Dockerfile
├── pnpm-lock.yaml
└── pnpm-workspace.yaml
```

## Developer setup

### Requirements

- Node.js 22 (the Docker images use Node 22).
- pnpm with support for the repository's pnpm 9 lockfile format; the Docker build uses pnpm 11.3.0 through Corepack.
- A Neon PostgreSQL database for the API. The self-host installer supports Neon connection URIs.
- OpenSSL for generating local application secrets.

### Install dependencies

```bash
git clone <repository-url>
cd Qube
corepack enable
pnpm install --frozen-lockfile
```

The `qube-js` workspace package exposes built files from `packages/qube-js/dist`. Build it before the first web build or when changing the SDK:

```bash
pnpm --filter qube-js build
```

### Configure the API

Create `apps/api/.env` for local development. Keep this file untracked and do not copy production credentials into examples or commits.

```dotenv
PORT=3000
DATABASE_URL=postgresql://USER:ENCODED_PASSWORD@YOUR_ENDPOINT.neon.tech/DATABASE?sslmode=verify-full
REALTIME_DATABASE_URL=

API_URL=http://localhost:3000/api
PUBLIC_API_URL=http://localhost:3000/api
WEB_URL=http://localhost:3001

JWT_ACCESS_SECRET=replace-with-a-random-secret
JWT_REFRESH_SECRET=replace-with-a-different-random-secret
PROJECT_JWT_SECRET=replace-with-a-third-random-secret
INVITE_SECRET=replace-with-a-fourth-random-secret
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_CALLBACK_URL=http://localhost:3000/api/auth/google/callback
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
GITHUB_CALLBACK_URL=http://localhost:3000/api/auth/github/callback
RESEND_API_KEY=
UPLOADTHING_TOKEN=
```

Use four distinct random secrets. For example, generate each value separately with `openssl rand -hex 32`. Percent-encode reserved characters in database credentials. `sslmode=verify-full` keeps certificate and hostname verification enabled.

`REALTIME_DATABASE_URL` is optional. When the main database URI uses a transaction pooler, provide a direct, unpooled URI here for PostgreSQL `LISTEN` / `NOTIFY`.

### Configure the web app

Create `apps/web/.env.local`:

```dotenv
NEXT_PUBLIC_API_URL=http://localhost:3000/api
API_URL=http://localhost:3000/api
JWT_ACCESS_SECRET=the-same-value-as-the-api
```

`NEXT_PUBLIC_API_URL` is compiled into browser JavaScript. `API_URL` is used by server-side web code. The web proxy also needs the API's `JWT_ACCESS_SECRET` to verify the access cookie.

### Apply migrations and start development servers

Apply migrations after the API environment points at the intended development database:

```bash
pnpm --filter api db:migrate
```

Start both apps from the repository root:

```bash
pnpm dev
```

Or start them separately:

```bash
pnpm dev:api   # http://localhost:3000/api
pnpm dev:web   # http://localhost:3001
```

Check API readiness at `http://localhost:3000/api/health`. The API and web app both need access to the configured database for normal dashboard use.

## Environment variables

| Variable | Required | Used by | Notes |
| --- | --- | --- | --- |
| `DATABASE_URL` | Yes | API and migration job | PostgreSQL/Neon URI. Use TLS and verify the server certificate. |
| `REALTIME_DATABASE_URL` | No | Realtime listener | Prefer a direct, unpooled connection for `LISTEN` / `NOTIFY`. |
| `JWT_ACCESS_SECRET` | Yes | API and web proxy | Must match in both processes. |
| `JWT_REFRESH_SECRET` | Yes | API | Signs refresh tokens. |
| `PROJECT_JWT_SECRET` | Yes | API | Signs and verifies project API keys. |
| `INVITE_SECRET` | Yes | API | Signs organization invite tokens. |
| `PORT` | No | API | Defaults to `3000`. |
| `WEB_URL` | No | API | Dashboard origin used for CORS; local default is `http://localhost:3001`. |
| `API_URL` | No | Web/API | Internal API URL for server-side requests. |
| `PUBLIC_API_URL` | No | API and web build | Public API base URL used in generated project links and browser calls. |
| `NEXT_PUBLIC_API_URL` | No | Web build | Browser-visible API URL; baked into the Next.js build. |
| `JWT_ACCESS_EXPIRES_IN` | No | API | Defaults to `15m`. |
| `JWT_REFRESH_EXPIRES_IN` | No | API | Defaults to `7d`. |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALLBACK_URL` | No | API | Google OAuth settings. Callback must match the provider configuration. |
| `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `GITHUB_CALLBACK_URL` | No | API | GitHub OAuth settings. Callback must match the provider configuration. |
| `RESEND_API_KEY` | No | API | Enables invitation email delivery. |
| `UPLOADTHING_TOKEN` | No | API | Enables UploadThing-backed object operations. |

The Docker installer writes its protected configuration to `.qube/.env`. Local development uses `apps/api/.env` and `apps/web/.env.local`; these configurations serve different workflows and should not be copied over each other blindly.

## Run Qube with Docker

For a fresh self-hosted installation, use the interactive installer from the repository checkout:

```bash
./scripts/qube install
```

The installer collects a Neon URI and initial administrator details, generates application secrets, builds the image, runs the one-shot migration service, starts the app container, waits for API and web health checks, and registers the administrator. The migration job must finish successfully before the app starts.

The dashboard and API default to `http://localhost:3001` and `http://localhost:3000/api`. PostgreSQL is external; Qube does not create or reset a database. The installer stores its config in `.qube/.env` with restricted file permissions. It converts accepted Neon `sslmode=require` values to `sslmode=verify-full` so TLS certificate checks remain explicit.

Lifecycle commands:

```bash
./scripts/qube start
./scripts/qube stop
./scripts/qube restart
./scripts/qube status
./scripts/qube logs
./scripts/qube update
./scripts/qube backup [backup.dump]
./scripts/qube restore backup.dump
./scripts/qube uninstall
```

The `migrate` service does not restart on failure. `./scripts/qube logs` includes migration and app logs. Backups and restores use PostgreSQL client tools in the app image. `uninstall` removes Qube's container resources and does not delete the external database. See [SELF_HOSTING.md](SELF_HOSTING.md) for deployment, configuration, backup, and troubleshooting details.

## Database development and migrations

The API's Drizzle schema definitions are in `apps/api/src/db/schema/`. The SQL migration history and Drizzle snapshots are in `apps/api/drizzle/`.

For a schema change:

1. Update the relevant TypeScript schema definition and exports.
2. Generate a migration from the API workspace:

   ```bash
   pnpm --filter api db:generate
   ```

3. Review the generated SQL, snapshot, and `meta/_journal.json` entry. Treat the SQL as a reviewed deployment change.
4. Test it against a disposable development database or a backed-up staging database.
5. Commit the new SQL and metadata files together.

Apply pending migrations in local development with:

```bash
pnpm --filter api db:migrate
```

For Docker deployments, Compose runs `scripts/run-qube-migrations.cjs` as a one-shot service before the application. The runner uses the checked-in migration directory, the same `drizzle` migration schema/table used by Drizzle ORM, and a PostgreSQL advisory lock. A failed migration exits non-zero, prints the original database error, and prevents app startup.

Do not rewrite or delete migrations that may have run in an existing environment. Do not use `db:push` as a production migration strategy. If the database and migration ledger disagree, take a backup and compare the ledger, live schema, and the exact migration SQL before deciding on a manual recovery.

## Application and SDK development

### API

The API is a NestJS application. Each feature generally keeps its controller, service, and module together under `apps/api/src/`. Add routes to the relevant feature module rather than creating unrelated cross-feature dependencies. The global `/api` prefix is set in `apps/api/src/main.ts`.

The API health route is `GET /api/health`. Authenticated dashboard routes use JWT cookies and organization membership guards. Project REST routes use project JWT keys and enforce read/write roles in `ProjectKeyGuard` and the controller.

### Web app

The dashboard is a Next.js App Router app under `apps/web/src/app/`. Feature-specific UI and server actions live under `apps/web/src/features/`; shared UI elements live under `apps/web/src/components/`.

Browser requests use `NEXT_PUBLIC_API_URL`. Server-side requests use `API_URL`. For a Docker image, `NEXT_PUBLIC_API_URL` is a build argument, so rebuild the image after changing it.

### Shared packages

- `@qube/constants`: shared role names and event/auth constants.
- `@qube/types`: shared API, event, and SDK types.
- `qube-js`: project client SDK, built from `packages/qube-js/`.

The `qube-js` package exports from `dist/`; build it before running a web production build after a clean clone. The root Docker build already builds `qube-js`, then the API, then the web app.

For SDK functionality, installation, query examples, realtime, storage, and authentication notes, see the [Qube JavaScript SDK guide](SDK.md). The package's implementation-oriented usage notes are also in [`packages/qube-js/README.md`](packages/qube-js/README.md).

### Project REST example

Project keys are sent as bearer tokens. Anonymous keys are intended for reads. Writes require the service-role key, which must remain server-side:

```bash
curl 'http://localhost:3000/api/projects/PROJECT_SLUG/rest/users?limit=10' \
  -H 'Authorization: Bearer PROJECT_ANON_KEY'
```

The project REST API supports `GET`, `POST`, `PATCH`, and `DELETE` per table. See the API Explorer in the dashboard for the available query options and generated examples.

## Commands

| Command | Description |
| --- | --- |
| `pnpm install --frozen-lockfile` | Install the locked workspace dependencies. |
| `pnpm dev` | Start API and web development processes concurrently. |
| `pnpm dev:api` | Start the NestJS API in watch mode. |
| `pnpm dev:web` | Start Next.js on port `3001`. |
| `pnpm --filter qube-js build` | Build SDK ESM, CommonJS, and type outputs. |
| `pnpm --filter api build` | Compile the API into `apps/api/dist/`. |
| `pnpm --filter web build` | Build the web app for production; build `qube-js` first on a clean checkout. |
| `pnpm --filter api db:generate` | Generate SQL migration and metadata from schema changes. |
| `pnpm --filter api db:migrate` | Apply pending migrations to the configured development database. |
| `pnpm --filter api db:push` | Directly push a schema in a development workflow; avoid for production. |
| `pnpm --filter api db:studio` | Open Drizzle Studio for the configured database. |
| `pnpm --filter api test` | Run API unit tests. |
| `pnpm --filter api test:e2e` | Run API end-to-end tests. |
| `pnpm --filter web lint` | Run web ESLint. |
| `pnpm --filter api lint` | Run API ESLint; the current script applies fixes. |
| `pnpm deploy:web` | Deploy the web package through Wrangler. |

## Testing and verification

Run checks relevant to the change. API tests are defined in `apps/api/package.json`; end-to-end tests may require a configured database and running services.

```bash
pnpm --filter api test
pnpm --filter api test:e2e
pnpm --filter web lint
pnpm --filter api build
pnpm --filter qube-js build
pnpm --filter web build
```

For Docker changes, validate Compose and build the image before starting services:

```bash
docker compose config
docker compose build
```

Starting Compose runs the migration job against the `DATABASE_URL` in the Compose environment. Use a disposable or backed-up database when verifying migrations. A successful image build does not verify database connectivity or migration compatibility.

## Security notes

- Keep database credentials, JWT secrets, OAuth secrets, Resend keys, and UploadThing tokens out of git and browser bundles.
- Use distinct, high-entropy application secrets. The access secret must match between API and web proxy configuration.
- Keep service-role project keys on trusted servers. Do not place them in public web environment variables.
- Use TLS with certificate and hostname verification for remote PostgreSQL connections. Do not solve certificate problems by disabling verification.
- The SQL editor runs in project context and applies request validation, but it is still a privileged database tool. Grant dashboard accounts access only to organizations they should manage.
- `PUBLIC_API_URL` and `NEXT_PUBLIC_API_URL` are public configuration values, not secret storage.
- Keep `.qube/.env`, `apps/api/.env`, and `apps/web/.env.local` private. The Docker installer creates `.qube/.env` with restrictive permissions.

## Contributing

1. Create a focused branch from the current project branch.
2. Keep feature code in its owning app or package and follow the pnpm workspace layout.
3. Add or update tests for behavior changes where the existing test structure supports them.
4. For database schema changes, include the reviewed SQL migration, snapshot, and journal update. Never regenerate or remove applied migration history blindly.
5. Run the relevant build, lint, and test commands and describe any checks that need external services.
6. Do not commit credentials, private database data, or screenshots containing personal information.

For a report, include the expected behavior, steps to reproduce, and sanitized logs or screenshots when useful.
