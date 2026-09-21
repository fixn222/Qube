import { integer, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { storageBuckets } from './storage-bucket';

export const storageObjects = pgTable('storage_objects', {
  id: uuid().defaultRandom().primaryKey(),
  bucketId: uuid('bucket_id').references(() => storageBuckets.id, {
    onDelete: 'cascade',
  }),
  name: text('name').notNull(),
  size: integer('size').notNull(),
  mimeType: text('mime_type').notNull(),
  utKey: text('ut_key').notNull(),
  url: text('url').notNull().default(''),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export type StorageObject = typeof storageObjects.$inferSelect;
export type NewStorageObject = typeof storageObjects.$inferInsert;
