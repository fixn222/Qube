import { createHash, randomUUID } from 'node:crypto';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { and, desc, eq, lt, sql } from 'drizzle-orm';
import type { SQL } from 'drizzle-orm';
import type {
  ObservatoryRange,
  ObservatorySeriesPoint,
  ObservatorySnapshot,
} from '@qube/types';
import { DrizzleService } from '../db/drizzle.service';
import { analyticsEvents, organizations, projects } from '../db/schema';

export type TelemetryEventType =
  | 'api.request'
  | 'sql.query'
  | 'realtime.connection'
  | 'realtime.subscription'
  | 'realtime.delivery'
  | 'schema.change'
  | 'project.activity'
  | 'app.error';

export interface TelemetryEventInput {
  projectId: string;
  eventType: TelemetryEventType;
  source:
    'project_api' | 'sql_editor' | 'realtime' | 'table_editor' | 'projects';
  requestId?: string;
  durationMs?: number;
  statusCode?: number;
  success?: boolean;
  operation?: string;
  resource?: string;
  queryFingerprint?: string;
  errorCode?: string;
}

type AggregateRow = {
  event_type: TelemetryEventType;
  operation?: string | null;
  bucket?: Date | string;
  event_count: number | string;
  successes: number | string;
  errors: number | string;
  avg_latency_ms: number | string | null;
  slow_queries?: number | string;
  opens?: number | string;
  closes?: number | string;
  deliveries?: number | string;
  p50: number | string | null;
  p95: number | string | null;
  p99: number | string | null;
};

type BucketUnit = 'minute' | 'hour' | 'day';

type MetricSummary = {
  requests: number;
  successes: number;
  errors: number;
  successRate: number | null;
  avgLatencyMs: number | null;
  p50: number | null;
  p95: number | null;
  p99: number | null;
};

type FingerprintRow = {
  query_fingerprint: string;
  event_count: number | string;
  avg_latency_ms: number | string | null;
  max_latency_ms: number | string | null;
};

const rangeConfig: Record<
  ObservatoryRange,
  { milliseconds: number; unit: BucketUnit; points: number }
> = {
  '1h': { milliseconds: 60 * 60 * 1000, unit: 'minute', points: 60 },
  '24h': { milliseconds: 24 * 60 * 60 * 1000, unit: 'hour', points: 24 },
  '7d': { milliseconds: 7 * 24 * 60 * 60 * 1000, unit: 'day', points: 7 },
  '30d': { milliseconds: 30 * 24 * 60 * 60 * 1000, unit: 'day', points: 30 },
};

const supportedRanges = new Set<ObservatoryRange>(['1h', '24h', '7d', '30d']);

export function normalizeObservatoryRange(value?: string): ObservatoryRange {
  return supportedRanges.has(value as ObservatoryRange)
    ? (value as ObservatoryRange)
    : '24h';
}

export function buildBucketAggregationQuery(
  projectId: string,
  start: Date,
  end: Date,
  unit: BucketUnit,
): SQL {
  // `unit` is selected only from the fixed rangeConfig allowlist. Compute it
  // once so PostgreSQL groups by exactly the selected bucket expression.
  return sql`
    WITH bucketed_events AS (
      SELECT event_type, success, status_code, duration_ms,
             date_trunc(${unit}, occurred_at, 'UTC') AS bucket
      FROM analytics_events
      WHERE project_id = ${projectId}
        AND occurred_at >= ${start}
        AND occurred_at < ${end}
    )
    SELECT event_type, bucket,
           count(*)::int AS event_count,
           count(*) FILTER (WHERE success IS TRUE)::int AS successes,
           count(*) FILTER (WHERE success IS FALSE OR status_code >= 400)::int AS errors,
           round(avg(duration_ms))::int AS avg_latency_ms,
           percentile_cont(0.50) WITHIN GROUP (ORDER BY duration_ms)
             FILTER (WHERE duration_ms IS NOT NULL) AS p50,
           percentile_cont(0.95) WITHIN GROUP (ORDER BY duration_ms)
             FILTER (WHERE duration_ms IS NOT NULL) AS p95,
           percentile_cont(0.99) WITHIN GROUP (ORDER BY duration_ms)
             FILTER (WHERE duration_ms IS NOT NULL) AS p99
    FROM bucketed_events
    GROUP BY event_type, bucket
    ORDER BY bucket
  `;
}

function count(value: number | string | null | undefined): number {
  const result = Number(value ?? 0);
  return Number.isFinite(result) ? result : 0;
}

function metric(value: number | string | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  const result = Number(value);
  return Number.isFinite(result) ? Math.round(result * 100) / 100 : null;
}

export function summarizeAggregateRows(rows: AggregateRow[]): MetricSummary {
  const requests = rows.reduce((sum, row) => sum + count(row.event_count), 0);
  const successes = rows.reduce((sum, row) => sum + count(row.successes), 0);
  const errors = rows.reduce((sum, row) => sum + count(row.errors), 0);
  const firstDefinedMetric = (key: 'avg_latency_ms' | 'p50' | 'p95' | 'p99') =>
    metric(
      rows.find((row) => row[key] !== null && row[key] !== undefined)?.[key],
    );

  return {
    requests,
    successes,
    errors,
    successRate: requests ? (successes / requests) * 100 : null,
    avgLatencyMs: firstDefinedMetric('avg_latency_ms'),
    p50: firstDefinedMetric('p50'),
    p95: firstDefinedMetric('p95'),
    p99: firstDefinedMetric('p99'),
  };
}

function cleanToken(
  value: string | undefined,
  limit: number,
): string | undefined {
  if (!value || !/^[A-Za-z0-9._:-]+$/.test(value)) return undefined;
  return value.slice(0, limit);
}

export function createQueryFingerprint(query: string): string {
  const normalized = query
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/--[^\r\n]*/g, ' ')
    .replace(/'(?:''|[^'])*'/g, '?')
    .replace(/\b\d+(?:\.\d+)?\b/g, '?')
    .replace(/\s*([=<>])\s*/g, ' $1 ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
  return createHash('sha256').update(normalized).digest('hex');
}

function toBucketDate(value: Date | string): Date {
  return value instanceof Date ? value : new Date(value);
}

function emptySeriesPoint(at: Date): ObservatorySeriesPoint {
  return {
    at: at.toISOString(),
    requests: 0,
    successes: 0,
    errors: 0,
    avgLatencyMs: null,
    p50: null,
    p95: null,
    p99: null,
  };
}

function buildSeries(
  range: ObservatoryRange,
  rows: AggregateRow[],
  eventTypes: TelemetryEventType[],
): ObservatorySeriesPoint[] {
  const config = rangeConfig[range];
  const step = config.milliseconds / config.points;
  const now = Date.now();
  const floor = Math.floor(now / step) * step;
  const first = floor - (config.points - 1) * step;
  const points = Array.from({ length: config.points }, (_, index) =>
    emptySeriesPoint(new Date(first + index * step)),
  );

  for (const row of rows) {
    if (!eventTypes.includes(row.event_type) || !row.bucket) continue;
    const bucketTime = toBucketDate(row.bucket).getTime();
    const index = Math.floor((bucketTime - first) / step);
    if (index < 0 || index >= points.length) continue;
    const point = points[index];
    point.requests += count(row.event_count);
    point.successes += count(row.successes);
    point.errors += count(row.errors);
    point.avgLatencyMs = metric(row.avg_latency_ms);
    point.p50 = metric(row.p50);
    point.p95 = metric(row.p95);
    point.p99 = metric(row.p99);
  }
  return points;
}

@Injectable()
export class AnalyticsService implements OnModuleInit, OnModuleDestroy {
  private retentionTimer?: NodeJS.Timeout;

  constructor(private readonly drizzle: DrizzleService) {}

  onModuleInit(): void {
    void this.pruneExpired();
    this.retentionTimer = setInterval(
      () => void this.pruneExpired(),
      24 * 60 * 60 * 1000,
    );
    this.retentionTimer.unref();
  }

  onModuleDestroy(): void {
    if (this.retentionTimer) clearInterval(this.retentionTimer);
  }

  async record(event: TelemetryEventInput): Promise<void> {
    if (!event.projectId) return;
    await this.drizzle.db.insert(analyticsEvents).values({
      projectId: event.projectId,
      eventType: event.eventType,
      source: event.source,
      requestId: cleanToken(event.requestId, 128) ?? randomUUID(),
      durationMs:
        event.durationMs !== undefined && Number.isFinite(event.durationMs)
          ? Math.max(0, Math.min(Math.round(event.durationMs), 2_147_483_647))
          : null,
      statusCode:
        event.statusCode !== undefined && Number.isInteger(event.statusCode)
          ? Math.max(100, Math.min(event.statusCode, 599))
          : null,
      success: event.success ?? null,
      operation: cleanToken(event.operation?.toUpperCase(), 32) ?? null,
      resource: event.resource?.replace(/[\r\n?].*$/, '').slice(0, 160) ?? null,
      queryFingerprint:
        event.queryFingerprint && /^[a-f0-9]{64}$/.test(event.queryFingerprint)
          ? event.queryFingerprint
          : null,
      errorCode: cleanToken(event.errorCode, 40) ?? null,
    });
  }

  async recordSafely(event: TelemetryEventInput): Promise<void> {
    try {
      await this.record(event);
    } catch {
      // Telemetry failures must not change a successful application request.
    }
  }

  private async pruneExpired(): Promise<void> {
    try {
      await this.drizzle.db
        .delete(analyticsEvents)
        .where(lt(analyticsEvents.occurredAt, sql`now() - interval '90 days'`));
    } catch {
      // Retention cleanup is best effort; the dashboard never depends on it.
    }
  }

  private async getProject(orgSlug: string, projectSlug: string) {
    const [project] = await this.drizzle.db
      .select({
        id: projects.id,
        name: projects.name,
        slug: projects.slug,
        schema: projects.dbSchema,
      })
      .from(projects)
      .innerJoin(organizations, eq(projects.orgId, organizations.id))
      .where(
        and(eq(organizations.slug, orgSlug), eq(projects.slug, projectSlug)),
      )
      .limit(1);
    return project;
  }

  async getDashboard(
    orgSlug: string,
    projectSlug: string,
    range: ObservatoryRange,
  ): Promise<ObservatorySnapshot> {
    const project = await this.getProject(orgSlug, projectSlug);
    if (!project) {
      throw new NotFoundException('Project not found');
    }
    const config = rangeConfig[range];
    if (!config) throw new BadRequestException('Unsupported analytics range');
    const end = new Date();
    const start = new Date(end.getTime() - config.milliseconds);

    const [telemetryTable, databaseSummary] = await Promise.all([
      this.drizzle.db.execute<{ ready: boolean }>(sql`
        SELECT to_regclass('public.analytics_events') IS NOT NULL AS ready
      `),
      this.drizzle.db.execute<{
        table_count: number | string;
        estimated_rows: number | string | null;
        size_bytes: number | string | null;
      }>(sql`
        SELECT count(*)::int AS table_count,
               CASE WHEN bool_or(c.reltuples < 0) THEN NULL ELSE sum(c.reltuples)::bigint END AS estimated_rows,
               sum(pg_total_relation_size(c.oid))::bigint AS size_bytes
        FROM pg_catalog.pg_class c
        JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = ${project.schema} AND c.relkind IN ('r', 'p')
      `),
    ]);
    const database = databaseSummary.rows[0];

    if (!telemetryTable.rows[0]?.ready) {
      const blankMetric = {
        requests: 0,
        successes: 0,
        errors: 0,
        successRate: null,
        avgLatencyMs: null,
        p50: null,
        p95: null,
        p99: null,
      };
      return {
        generatedAt: new Date().toISOString(),
        range,
        totalEvents: 0,
        totalErrors: 0,
        telemetryStatus: 'migration_required',
        telemetryAvailableSince: null,
        project: {
          id: project.id,
          name: project.name,
          slug: project.slug,
          schema: project.schema,
        },
        database: {
          tableCount: count(database?.table_count),
          estimatedRows:
            database?.estimated_rows == null
              ? null
              : metric(database.estimated_rows),
          sizeBytes:
            database?.size_bytes == null ? null : metric(database.size_bytes),
        },
        health: {
          status: 'unknown',
          detail: 'Apply the Qube database migrations to enable telemetry.',
        },
        api: {
          ...blankMetric,
          series: buildSeries(range, [], ['api.request']),
        },
        sql: {
          queries: 0,
          errors: 0,
          slowQueries: 0,
          avgLatencyMs: null,
          p50: null,
          p95: null,
          p99: null,
          series: buildSeries(range, [], ['sql.query']),
          topFingerprints: [],
        },
        realtime: {
          connectionOpens: 0,
          connectionCloses: 0,
          subscriptionOpens: 0,
          subscriptionCloses: 0,
          deliveries: 0,
          series: buildSeries(
            range,
            [],
            [
              'realtime.connection',
              'realtime.subscription',
              'realtime.delivery',
            ],
          ),
        },
        recentEvents: [],
      };
    }

    const [
      summaryResult,
      seriesResult,
      fingerprintResult,
      recentResult,
      firstSeenResult,
    ] = await Promise.all([
      this.drizzle.db.execute<AggregateRow>(sql`
          SELECT event_type,
                 count(*)::int AS event_count,
                 count(*) FILTER (WHERE success IS TRUE)::int AS successes,
                 count(*) FILTER (WHERE success IS FALSE OR status_code >= 400)::int AS errors,
                 count(*) FILTER (WHERE event_type = 'sql.query' AND duration_ms >= 1000)::int AS slow_queries,
                 count(*) FILTER (WHERE operation = 'OPEN')::int AS opens,
                 count(*) FILTER (WHERE operation = 'CLOSE')::int AS closes,
                 count(*) FILTER (WHERE operation = 'DELIVERY')::int AS deliveries,
                 round(avg(duration_ms))::int AS avg_latency_ms,
                 percentile_cont(0.50) WITHIN GROUP (ORDER BY duration_ms)
                   FILTER (WHERE duration_ms IS NOT NULL) AS p50,
                 percentile_cont(0.95) WITHIN GROUP (ORDER BY duration_ms)
                   FILTER (WHERE duration_ms IS NOT NULL) AS p95,
                 percentile_cont(0.99) WITHIN GROUP (ORDER BY duration_ms)
                   FILTER (WHERE duration_ms IS NOT NULL) AS p99
          FROM analytics_events
          WHERE project_id = ${project.id}
            AND occurred_at >= ${start}
            AND occurred_at < ${end}
          GROUP BY event_type
        `),
      this.drizzle.db.execute<AggregateRow>(
        buildBucketAggregationQuery(project.id, start, end, config.unit),
      ),
      this.drizzle.db.execute<FingerprintRow>(sql`
          SELECT query_fingerprint,
                 count(*)::int AS event_count,
                 round(avg(duration_ms))::int AS avg_latency_ms,
                 max(duration_ms)::int AS max_latency_ms
          FROM analytics_events
          WHERE project_id = ${project.id}
            AND event_type = 'sql.query'
            AND query_fingerprint IS NOT NULL
            AND occurred_at >= ${start}
            AND occurred_at < ${end}
          GROUP BY query_fingerprint
          ORDER BY avg(duration_ms) DESC NULLS LAST
          LIMIT 10
        `),
      this.drizzle.db
        .select({
          id: analyticsEvents.id,
          eventType: analyticsEvents.eventType,
          source: analyticsEvents.source,
          occurredAt: analyticsEvents.occurredAt,
          operation: analyticsEvents.operation,
          resource: analyticsEvents.resource,
          durationMs: analyticsEvents.durationMs,
          statusCode: analyticsEvents.statusCode,
          success: analyticsEvents.success,
          errorCode: analyticsEvents.errorCode,
        })
        .from(analyticsEvents)
        .where(
          and(
            eq(analyticsEvents.projectId, project.id),
            sql`${analyticsEvents.occurredAt} >= ${start}`,
            sql`${analyticsEvents.occurredAt} < ${end}`,
          ),
        )
        .orderBy(desc(analyticsEvents.occurredAt))
        .limit(30),
      this.drizzle.db.execute<{ first_seen: Date | string | null }>(sql`
          SELECT min(occurred_at) AS first_seen
          FROM analytics_events
          WHERE project_id = ${project.id}
        `),
    ]);

    const summary = summaryResult.rows;
    const apiRows = summary.filter((row) => row.event_type === 'api.request');
    const sqlRows = summary.filter((row) => row.event_type === 'sql.query');
    const api = summarizeAggregateRows(apiRows);
    const sqlMetrics = summarizeAggregateRows(sqlRows);
    const realtimeRows = summary.filter((row) =>
      row.event_type.startsWith('realtime.'),
    );
    const totalEvents = summary.reduce(
      (sum, row) => sum + count(row.event_count),
      0,
    );
    const totalErrors = summary.reduce(
      (sum, row) => sum + count(row.errors),
      0,
    );
    const operationCount = (
      eventType: string,
      field: 'opens' | 'closes' | 'deliveries',
    ) => count(summary.find((row) => row.event_type === eventType)?.[field]);
    const firstSeen = firstSeenResult.rows[0]?.first_seen;
    const successRate = api.successRate;

    return {
      generatedAt: new Date().toISOString(),
      range,
      totalEvents,
      totalErrors,
      telemetryStatus: 'ready',
      telemetryAvailableSince: firstSeen
        ? toBucketDate(firstSeen).toISOString()
        : null,
      project: {
        id: project.id,
        name: project.name,
        slug: project.slug,
        schema: project.schema,
      },
      database: {
        tableCount: count(database?.table_count),
        estimatedRows:
          database?.estimated_rows === null
            ? null
            : metric(database?.estimated_rows),
        sizeBytes:
          database?.size_bytes === null ? null : metric(database?.size_bytes),
      },
      health: {
        status:
          successRate === null
            ? 'unknown'
            : successRate >= 95
              ? 'operational'
              : 'degraded',
        detail:
          successRate === null
            ? 'No API request telemetry has been collected in this range.'
            : `${successRate.toFixed(1)}% of instrumented API requests succeeded in this range.`,
      },
      api: {
        ...api,
        series: buildSeries(range, seriesResult.rows, ['api.request']),
      },
      sql: {
        queries: sqlMetrics.requests,
        errors: sqlMetrics.errors,
        slowQueries: sqlRows.reduce(
          (sum, row) => sum + count(row.slow_queries),
          0,
        ),
        avgLatencyMs: sqlMetrics.avgLatencyMs,
        p50: sqlMetrics.p50,
        p95: sqlMetrics.p95,
        p99: sqlMetrics.p99,
        series: buildSeries(range, seriesResult.rows, ['sql.query']),
        topFingerprints: fingerprintResult.rows.map((row) => ({
          fingerprint: row.query_fingerprint,
          count: count(row.event_count),
          avgLatencyMs: metric(row.avg_latency_ms),
          maxLatencyMs: metric(row.max_latency_ms),
        })),
      },
      realtime: {
        connectionOpens: operationCount('realtime.connection', 'opens'),
        connectionCloses: operationCount('realtime.connection', 'closes'),
        subscriptionOpens: operationCount('realtime.subscription', 'opens'),
        subscriptionCloses: operationCount('realtime.subscription', 'closes'),
        deliveries: operationCount('realtime.delivery', 'deliveries'),
        series: buildSeries(
          range,
          seriesResult.rows,
          realtimeRows.map((row) => row.event_type),
        ),
      },
      recentEvents: recentResult.map((event) => ({
        ...event,
        occurredAt: event.occurredAt.toISOString(),
      })),
    };
  }

  async getRecentEvents(
    orgSlug: string,
    projectSlug: string,
    limit: number,
    offset: number,
  ) {
    const project = await this.getProject(orgSlug, projectSlug);
    if (!project) throw new NotFoundException('Project not found');
    return this.drizzle.db
      .select({
        id: analyticsEvents.id,
        eventType: analyticsEvents.eventType,
        source: analyticsEvents.source,
        occurredAt: analyticsEvents.occurredAt,
        operation: analyticsEvents.operation,
        resource: analyticsEvents.resource,
        durationMs: analyticsEvents.durationMs,
        statusCode: analyticsEvents.statusCode,
        success: analyticsEvents.success,
        errorCode: analyticsEvents.errorCode,
      })
      .from(analyticsEvents)
      .where(eq(analyticsEvents.projectId, project.id))
      .orderBy(desc(analyticsEvents.occurredAt))
      .limit(Math.max(1, Math.min(limit, 100)))
      .offset(Math.max(0, offset));
  }
}
