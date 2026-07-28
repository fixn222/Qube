import { pgTable, timestamp, text, uuid } from 'drizzle-orm/pg-core';
import { organizations } from './orgs';

export const projects = pgTable('projects', {
  id: uuid().defaultRandom().primaryKey(),
  orgId: uuid()
    .notNull()
    .references(() => organizations.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  dbSchema: text('db_schema').notNull().unique(),
  projectUrl: text('project_url').notNull().unique(),
  annonKey: text('annon_key').notNull(),
  serviceRoleKey: text('service_role_key').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export type Project = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;
