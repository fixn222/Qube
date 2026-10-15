# Qube Observatory 2.0

## Repository findings

- **Workspace:** pnpm workspaces: `apps/web`, `apps/api`, and `packages/{types,constants,qube-js}`. Root scripts start the web and API; API package has Jest and build/lint scripts; web has build/lint scripts. Next is configured for standalone output.
- **Web:** Next.js 16 App Router and React 19. Project routes already provide a table editor, SQL editor/history, API docs, storage, and Socket.IO Realtime UI. The shared sidebar is the project navigation entry point.
- **API:** NestJS 11, Express, global `/api` prefix, cookie JWT for dashboard operations, organization membership/role guard, project JWT keys for generated REST and SDK access.
- **Data:** Drizzle ORM connects through Neon’s HTTP driver to `DATABASE_URL`. Qube’s users, organizations, projects, query history, and storage metadata live there. Each Qube project is a PostgreSQL schema in that same database; there is no separate per-project database URL in the project model. The existing Realtime listener uses `pg` direct connections and `REALTIME_DATABASE_URL` (falling back to `DATABASE_URL`).
- **Observability baseline:** SQL history records raw SQL, duration, and row count. Realtime delivers row change payloads over Socket.IO. There is no request telemetry, event retention, analytics API, schema diagram, Neon management API client, or SSE transport yet. Metrics must remain explicitly unavailable where no instrumented source exists.
- **Deployment baseline:** API and web Dockerfiles exist, but there is no Compose stack, lifecycle CLI, installer, backup workflow, or self-hosting guide. The API image currently starts the development command and exposes a port inconsistent with the API default. The web Dockerfile uses the existing standalone output.

## Implementation plan

1. **Schema discovery:** add a project-authorized, read-only PostgreSQL catalog introspection endpoint and provider-neutral schema types. Include columns, composite PK/FK/unique/check constraints, indexes, table size estimates, relationship cardinality, and junction-table detection. Cover extraction logic with unit tests.
2. **Observatory UI:** add Overview and ER Diagram project routes, a read-only interactive diagram with search, filtering, selection/inspection, zoom/pan/fit, and links into SQL. Add clearly labeled unavailable states for telemetry without a source.
3. **Telemetry:** add bounded, indexed project telemetry storage and aggregation. Record SQL timings/errors without parameters or results, generated REST request metadata, and Realtime connection/event counts. Add project-authorized analytics endpoints and aggregated SSE updates; do not claim provider CPU or database metrics that are unavailable.
4. **Neon and self-hosting:** use Neon’s documented Bearer API only in a local installer to validate credentials, list/select a project, and fetch a connection URI. Add a protected `.env` workflow, production Compose services, health checks, and explicit lifecycle commands. The Neon key is not persisted. Existing Qube schemas remain in the selected PostgreSQL database.
5. **Hardening and documentation:** idempotent setup, no clobbering existing config/data, backup/restore, least exposure, non-root containers where feasible, security/troubleshooting docs, tests, and regression/build checks.

## Compatibility and safety decisions

- Keep internal Qube metadata and customer project schemas in the configured PostgreSQL database, matching the current model. The installer can accept Neon or another PostgreSQL URL; Neon API-key selection is optional when a connection URL is supplied directly.
- Use confirmed database constraints for ER edges. Label heuristic many-to-many suggestions separately; never present inferred links as enforced constraints.
- Keep credentials out of browser APIs and telemetry. Do not store raw query events in the new telemetry system. Existing SQL editor history remains intact for its current user-facing query recall behavior.
- Do not create Neon resources automatically. Project creation is an explicit, separately confirmed action if ever added.

## Progress

- [x] Inventory workspace, frameworks, modules, models, auth boundaries, scripts, and deployment files.
- [x] Schema introspection API and normalized types/tests.
- [x] Observatory overview and interactive read-only ER diagram routes.
- [x] Aggregated API/SQL/Realtime metrics, instrumentation, and SSE updates.
- [x] Neon existing-project setup and self-hosted Compose/installer.
- [x] Lifecycle commands, backup/restore, and self-hosting/security documentation.
- [ ] Schema snapshots/diffs, broad application activity/error instrumentation, and Neon branch selection.
- [ ] Signed release images, remote one-line release installer, clean-environment Docker E2E, and full lint cleanup.

## Implementation notes and verification

- Added catalog introspection and composite-FK/junction suggestion unit coverage. ER relationships from constraints are distinct from separately styled suggestions. Diagram UI is read-only.
- Added `analytics_events` migration with indexes and 90-day cleanup. Events are scoped by the authenticated project lookup; new telemetry stores no SQL text, parameters, results, tokens, or passwords. Existing SQL `query_history` still stores its SQL text.
- Qube REST request, SQL editor, Realtime connection/subscription/delivery events feed authenticated project analytics and SSE endpoints. The overview shows unknown/empty telemetry explicitly and reports catalog estimates only.
- Added `docker-compose.yml`, non-root API/web runners, health checks, migration-on-start, and `scripts/qube` install/lifecycle/backup/restore commands. The installer supports direct PostgreSQL URLs or optional Neon key validation and existing project/default-branch URI retrieval. It does not create Neon projects.
- API production build passed; API unit suite passed (3 suites, 5 tests); Web TypeScript check passed; Web lint passed with warnings; new analytics and schema files passed scoped ESLint; Docker Compose config validation passed with temporary placeholder environment values; installer syntax and help passed; `git diff --check` passed.
- Full API lint reports existing formatting violations across unrelated API files (the package lint script also applies `--fix`, so it was not run globally). Web production build did not complete: Turbopack build attempts stalled without output, and a webpack attempt failed while parsing TypeScript's `--showConfig` output despite standalone `tsc --noEmit` passing. Docker Engine is installed but the daemon socket is not accessible here, so no container end-to-end run is claimed.

## Neon API references

- [Neon API authentication](https://api-docs.neon.tech/reference/authentication): API requests use a Bearer token.
- [List Neon projects](https://api-docs.neon.tech/reference/listprojects): supports cursor pagination and `org_id` for personal keys accessing organization projects.
- [Retrieve a connection URI](https://api-docs.neon.tech/reference/getconnectionuri): requires database and role names, with optional branch/endpoint and pooled URI parameters.
