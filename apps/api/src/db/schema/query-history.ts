import { pgTable, text, timestamp, uuid, integer } from 'drizzle-orm/pg-core';
import { projects } from './projects';

export const queryHistory = pgTable('query_history', {
  id: uuid().defaultRandom().primaryKey(),
  projectId: uuid('project_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  sql: text('sql').notNull(),
  executionTimeMs: integer('execution_time_ms').notNull(),
  rowCount: integer('row_count').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export type QuertHistory = typeof queryHistory.$inferSelect;
export type NewQueryHistoryItem = typeof queryHistory.$inferInsert;
