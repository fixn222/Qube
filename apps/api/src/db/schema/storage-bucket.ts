import { pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { projects } from './projects';

export const bucketAccessEnum = pgEnum('bucket_access', ['public', 'private']);

export const storageBuckets = pgTable('storage_buckets', {
  id: uuid().defaultRandom().primaryKey(),
  projectId: uuid('project_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  access: bucketAccessEnum('access').notNull().default('public'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export type StorageBucket = typeof storageBuckets.$inferSelect;
export type NewStorageBucket = typeof storageBuckets.$inferInsert;
