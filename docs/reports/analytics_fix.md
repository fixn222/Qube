# Analytics Dashboard PostgreSQL Fix

## Root cause

The time-series query parameterized `date_trunc` twice: once in the `SELECT` list and again in `GROUP BY`. PostgreSQL treated those as distinct expressions, which caused SQLSTATE `42803` for `occurred_at` even though both parameters contained the same interval.

## Changes

- `apps/api/src/analytics/analytics.service.ts` now computes a single UTC `bucket` in a CTE and groups by `event_type, bucket`. Project ID, range boundaries, and the interval remain bound parameters. The interval is selected from the fixed `minute`, `hour`, and `day` values configured for supported ranges; arbitrary interval input is not interpolated into SQL.
- Dashboard queries now use a captured half-open `[start, end)` window. Summary, time-series, slow query, and recent event results therefore exclude future timestamps and share consistent range boundaries.
- Aggregate counts and latency values preserve empty and null-duration behavior. SQL errors are allowed to reject the dashboard request; Nest handles them as HTTP 500 and logs the database exception instead of returning partial metrics. The realtime stream emits a generic `telemetry-error` event on a failed refresh and keeps the stream alive; internal error details remain server-side.
- `apps/web/src/features/observatory/observatory-client.tsx` now consumes the named `snapshot` SSE event emitted by Nest. It avoids refetching the initial 24-hour snapshot when server rendering already supplied it. The existing periodic live refresh remains enabled.
- `apps/api/src/analytics/analytics.controller.ts` uses one explicit range allowlist for dashboard and stream requests. Unsupported range strings fall back to `24h`; weekly buckets are not currently a supported dashboard range.
- Added 9 analytics regression cases in `apps/api/src/analytics/analytics.service.spec.ts` covering hourly/daily SQL, single bucket expression and grouping, multiple event types, parameterized project/time filters, aggregate totals and percentiles, empty data, null durations, invalid ranges, and database failure propagation. The two existing fingerprint tests remain.

## Query review

- Summary aggregation groups by `event_type`; all other selected metrics are aggregates.
- Bucket aggregation groups by the CTE's `event_type` and `bucket` aliases.
- Fingerprint aggregation groups by `query_fingerprint`; average duration is aggregated for ordering.
- Recent events and first-seen queries are not grouped; `min(occurred_at)` is correctly aggregated.
- Catalog table and size counts use aggregate functions without selecting ungrouped columns.
- Successes count `success IS TRUE`. Errors count `success IS FALSE OR status_code >= 400`; each row is counted once by the single `FILTER` predicate. Average and percentile functions ignore null durations, and percentiles also explicitly filter nulls.
- Queries remain scoped by the selected project ID. No joins are used in event aggregations, so there is no join-driven duplicate counting.

## Repeated requests

Before this change, the page could request the same initial snapshot through the server-rendered fetch, a browser GET, and the SSE stream's `startWith(0)`. SSE then polls every 10 seconds, and EventSource reconnects automatically after a stream error. The redundant browser GET and immediate SSE query are removed when a server snapshot exists. The intended 10-second live cadence remains.

## Verification

Executed successfully:

- `pnpm --filter api exec jest --runInBand` — 3 suites passed, 14 tests passed.
- `pnpm --filter api build` — passed.
- `pnpm --filter api exec eslint src/analytics/analytics.service.ts src/analytics/analytics.controller.ts src/analytics/analytics.service.spec.ts` — passed.
- `pnpm --filter web exec tsc --noEmit` — passed.
- `pnpm --filter web exec eslint src/features/observatory/observatory-client.tsx src/lib/axios.ts` — passed.
- `git diff --check` — passed.

These tests validate the generated SQL shape and application-side metric handling. A PostgreSQL integration run with fixture events was not performed because no isolated analytics test database was available; the configured database was not modified for test data. To complete that check, configure a disposable PostgreSQL/Neon test database, seed fixtures spanning multiple projects and hourly/daily buckets, run the grouped query against it, and assert event counts and PostgreSQL percentile results.
