# Qube navigation and analytics UX update

## Audit findings

- The project sidebar presented analytics as separate top-level destinations. API analytics, realtime analytics, logs, and performance did not share one active navigation category.
- `/overview`, `/analytics/api`, `/analytics/realtime`, `/logs`, and `/performance` all rendered the same general Observatory dashboard, with some pages changing only the heading. The page titles therefore promised distinctions the content did not provide.
- Project overview and the analytics landing page duplicated the same metrics view.
- The ER diagram was reachable at `/erd`, outside Analytics, despite using the real schema snapshot and verified FK metadata already provided by Qube.
- Initial analytics snapshots were fetched server-side, then fetched again in the browser when the selected range changed through a navigation. The client also allowed stale requests to overwrite newer range results.
- The API endpoint throws when its SQL fails. The successful `GET /organizations/.../overview` log is a Next.js page response, not the analytics API response: server-side snapshot loading catches API errors and returns `null`, so Next.js can render the page with HTTP 200 while the client’s API request reports the actual failure. The UI now presents the API error and retry action; backend failures are not turned into fabricated zero metrics.
- Analytics aggregation uses `date_trunc` with independently parameterized SELECT and GROUP BY expressions. PostgreSQL can reject those as non-matching expressions (SQLSTATE 42803).

## Navigation structure

| Group | Destination | Route |
| --- | --- | --- |
| Workspace | Project overview | `/organizations/[org]/[project]/overview` |
| Workspace | Projects | `/organizations/[org]/projects` |
| Workspace | Project settings | `/organizations/[org]/[project]/settings` |
| Analytics | Overview | `/organizations/[org]/[project]/analytics` |
| Analytics | Events & activity | `/analytics/events` |
| Analytics | API usage & traffic | `/analytics/api` |
| Analytics | Performance & latency | `/analytics/performance` |
| Analytics | Errors & failures | `/analytics/errors` |
| Analytics | Database Explorer | `/analytics/data-model` |
| Analytics | Realtime activity | `/analytics/realtime` |
| Developer tools | SQL Editor, API Explorer, Database tables, Storage, Realtime | Existing project routes |
| Administration | Team & access | `/organizations/[org]/settings/members` |

The sidebar uses expandable groups, highlights the active destination and its parent, and carries an analytics time range across analytics links. Project switching preserves the current route and query string. Old `/logs`, `/performance`, and `/erd` URLs remain compatible and redirect to their unified destinations.

## Implemented changes

- Added distinct content for project overview and the analytics landing page.
- Added route-specific events, API, errors, performance, and realtime pages using the existing Observatory snapshot/API rather than duplicating fetch and telemetry logic.
- Added date range state to analytics URLs and support for browser back/forward. Aborted superseded requests so stale results cannot replace the current selection.
- Added consistent event tables, summary metrics, no-data messages, timestamp labels, and links between related analysis pages. Counts and charts use available instrumented Qube data only; unavailable provider metrics remain unreported.
- Made Database Explorer the analytics destination while retaining the old ERD URL as an alias. It continues to use server-fetched schema metadata and the existing read-only React Flow viewer.
- Fixed SQL aggregation by computing `date_trunc` once in a CTE and grouping by the bucket alias. Range values are normalized to the fixed supported range set; project and date bounds remain bound parameters.
- Kept analytics API exceptions as failures. The client shows authorization, endpoint, network, and HTTP errors with retry. SSE refresh failures are logged server-side and emitted as a generic `telemetry-error` event while preserving the last successful snapshot.

## Files changed for this UX pass

- `apps/web/src/components/app-sidebar.tsx` — grouped, expandable navigation and active state.
- `apps/web/src/components/top-nav.tsx` — preserve current route and range when switching projects.
- `apps/web/src/features/observatory/observatory-client.tsx` — distinct analytics views, URL range, stable timestamps, and stale request cancellation.
- `apps/web/src/features/observatory/observatory-page.tsx` — shared route wrapper and range validation.
- `apps/web/src/features/schema/schema-diagram-client.tsx` — use the Database Explorer product name in the existing schema viewer.
- `apps/web/src/app/(dashboard)/organizations/[slug]/[projectSlug]/analytics/**/page.tsx` — dedicated Analytics routes.
- `apps/web/src/app/(dashboard)/organizations/[slug]/[projectSlug]/overview/page.tsx` — distinct project summary route.
- `apps/web/src/app/(dashboard)/organizations/[slug]/[projectSlug]/logs/page.tsx`, `performance/page.tsx`, `erd/page.tsx` — compatibility redirects.
- `apps/api/src/analytics/analytics.service.ts`, `analytics.controller.ts`, and `analytics.service.spec.ts` — SQL correction, error path, and regression coverage (from the analytics fix work).

## Verification

- `pnpm --filter api exec jest --runInBand` — passed: 3 suites, 14 tests.
- `pnpm --filter api build` — passed.
- `pnpm --filter api exec eslint src/analytics/analytics.service.ts src/analytics/analytics.controller.ts src/analytics/analytics.service.spec.ts` — passed.
- `pnpm --filter web exec tsc --noEmit` — passed after fixes.
- Focused web ESLint over the changed navigation, Observatory, and route files — passed after fixes.
- `git diff --check` — passed.
- `pnpm --filter web build` — not verified: Next.js started the optimized production build but emitted no further output for over a minute. The run was interrupted; no successful build is claimed.
- No live PostgreSQL integration check was run; API regression tests verify aggregation SQL shape and aggregation helpers without production database access.

## Remaining limits

- The Events view displays the latest 30 events returned by the dashboard snapshot; full server pagination is not yet wired into this screen.
- API and database metrics reflect Qube-instrumented operations. Neon provider-level resource metrics, client-side SDK requests, and comprehensive security audit history are not available from the current backend and are not presented as measured values.
- The web workspace has no dedicated navigation or component test runner configured. Route correctness was checked through type checking, linting, and the production build attempt; manual browser QA against an authenticated database was not available in this run.
