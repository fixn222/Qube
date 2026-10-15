import { PgDialect } from 'drizzle-orm/pg-core';
import {
  AnalyticsService,
  buildBucketAggregationQuery,
  createQueryFingerprint,
  normalizeObservatoryRange,
  summarizeAggregateRows,
} from './analytics.service';

const dialect = new PgDialect();
const projectId = '6e17083d-37ab-494c-8b8c-822f45201c91';
const start = new Date('2026-10-01T00:00:00.000Z');
const end = new Date('2026-10-02T00:00:00.000Z');

describe('analytics bucket aggregation', () => {
  it.each(['hour', 'day'] as const)(
    'computes and groups the %s bucket once',
    (unit) => {
      const query = dialect.sqlToQuery(
        buildBucketAggregationQuery(projectId, start, end, unit),
      );

      expect(query.sql.match(/date_trunc\(/g)).toHaveLength(1);
      expect(query.sql).toContain('GROUP BY event_type, bucket');
      expect(query.sql).toContain('ORDER BY bucket');
      expect(query.sql).toContain('WHERE project_id = $2');
      expect(query.sql).toContain('occurred_at >= $3');
      expect(query.sql).toContain('occurred_at < $4');
      expect(query.params).toEqual([unit, projectId, start, end]);
      expect(query.sql).toContain('count(*) FILTER (WHERE success IS TRUE)');
      expect(query.sql).toContain(
        'count(*) FILTER (WHERE success IS FALSE OR status_code >= 400)',
      );
      expect(query.sql).toContain('round(avg(duration_ms))::int');
      expect(query.sql).toContain('percentile_cont(0.50)');
      expect(query.sql).toContain('percentile_cont(0.95)');
      expect(query.sql).toContain('percentile_cont(0.99)');
      expect(
        query.sql.match(/FILTER \(WHERE duration_ms IS NOT NULL\)/g),
      ).toHaveLength(3);
    },
  );

  it('keeps separate event types grouped inside the same time bucket', () => {
    const query = dialect.sqlToQuery(
      buildBucketAggregationQuery(projectId, start, end, 'hour'),
    );
    expect(query.sql).toContain('SELECT event_type, bucket');
    expect(query.sql).toContain('GROUP BY event_type, bucket');
  });

  it('keeps the project and time boundaries parameterized', () => {
    const query = dialect.sqlToQuery(
      buildBucketAggregationQuery(projectId, start, end, 'day'),
    );
    expect(query.params).toContain(projectId);
    expect(query.params).toContain(start);
    expect(query.params).toContain(end);
    expect(query.sql).not.toContain(projectId);
  });

  it('does not accept arbitrary dashboard ranges', () => {
    expect(normalizeObservatoryRange('1h')).toBe('1h');
    expect(normalizeObservatoryRange('7d')).toBe('7d');
    expect(normalizeObservatoryRange('week; DROP TABLE analytics_events')).toBe(
      '24h',
    );
    expect(normalizeObservatoryRange(undefined)).toBe('24h');
  });
});

describe('analytics aggregate response math', () => {
  it('preserves counts and percentile values returned for one event type', () => {
    const summary = summarizeAggregateRows([
      {
        event_type: 'api.request',
        event_count: '5',
        successes: '3',
        errors: '2',
        avg_latency_ms: '60',
        p50: '40',
        p95: '95',
        p99: '100',
      },
    ]);

    expect(summary).toEqual({
      requests: 5,
      successes: 3,
      errors: 2,
      successRate: 60,
      avgLatencyMs: 60,
      p50: 40,
      p95: 95,
      p99: 100,
    });
  });

  it('returns unknown latency and success rate for an empty dataset', () => {
    expect(summarizeAggregateRows([])).toEqual({
      requests: 0,
      successes: 0,
      errors: 0,
      successRate: null,
      avgLatencyMs: null,
      p50: null,
      p95: null,
      p99: null,
    });
  });

  it('keeps latency metrics null when events have no duration', () => {
    expect(
      summarizeAggregateRows([
        {
          event_type: 'api.request',
          event_count: 2,
          successes: 1,
          errors: 1,
          avg_latency_ms: null,
          p50: null,
          p95: null,
          p99: null,
        },
      ]),
    ).toMatchObject({
      requests: 2,
      successes: 1,
      errors: 1,
      avgLatencyMs: null,
      p50: null,
      p95: null,
      p99: null,
    });
  });
});

describe('analytics database failures', () => {
  it('propagates dashboard query failures instead of returning partial metrics', async () => {
    const chain = {
      from: jest.fn(),
      innerJoin: jest.fn(),
      where: jest.fn(),
      limit: jest.fn().mockResolvedValue([
        {
          id: projectId,
          name: 'Project',
          slug: 'project',
          schema: 'project_schema',
        },
      ]),
    };
    chain.from.mockReturnValue(chain);
    chain.innerJoin.mockReturnValue(chain);
    chain.where.mockReturnValue(chain);
    const db = {
      select: jest.fn().mockReturnValue(chain),
      execute: jest.fn().mockRejectedValue(new Error('database unavailable')),
    };
    const service = new AnalyticsService({ db } as never);

    await expect(service.getDashboard('org', 'project', '24h')).rejects.toThrow(
      'database unavailable',
    );
  });
});

describe('createQueryFingerprint', () => {
  it('normalizes literal values before hashing query text', () => {
    const first = createQueryFingerprint(
      "SELECT * FROM users WHERE email = 'alice@example.com' AND id = 42",
    );
    const second = createQueryFingerprint(
      " select * from users where email='bob@example.com' and id=7 ",
    );
    expect(first).toBe(second);
    expect(first).toMatch(/^[a-f0-9]{64}$/);
  });

  it('does not retain the original SQL or secret literal in the fingerprint', () => {
    const fingerprint = createQueryFingerprint("SELECT 'sensitive-value'");
    expect(fingerprint).not.toContain('sensitive-value');
    expect(fingerprint).not.toContain('SELECT');
  });
});
