import {
  boolean,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { projects } from './projects';

export const analyticsEvents = pgTable(
  'analytics_events',
  {
    id: uuid().defaultRandom().primaryKey(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    eventType: text('event_type').notNull(),
    source: text('source').notNull(),
    occurredAt: timestamp('occurred_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    requestId: text('request_id'),
    durationMs: integer('duration_ms'),
    statusCode: integer('status_code'),
    success: boolean('success'),
    operation: text('operation'),
    resource: text('resource'),
    queryFingerprint: text('query_fingerprint'),
    errorCode: text('error_code'),
  },
  (table) => [
    index('analytics_events_project_time_idx').on(
      table.projectId,
      table.occurredAt,
    ),
    index('analytics_events_project_type_time_idx').on(
      table.projectId,
      table.eventType,
      table.occurredAt,
    ),
    index('analytics_events_project_fingerprint_time_idx').on(
      table.projectId,
      table.queryFingerprint,
      table.occurredAt,
    ),
  ],
);

export type AnalyticsEvent = typeof analyticsEvents.$inferSelect;
export type NewAnalyticsEvent = typeof analyticsEvents.$inferInsert;
