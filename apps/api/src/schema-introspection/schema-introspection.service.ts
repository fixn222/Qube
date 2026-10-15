import { createHash } from 'node:crypto';
import { Injectable, NotFoundException } from '@nestjs/common';
import { and, eq, sql } from 'drizzle-orm';
import type {
  ProjectSchemaSnapshot,
  SchemaColumn,
  SchemaConstraint,
  SchemaConstraintType,
  SchemaIndex,
  SchemaRelationship,
  SchemaRelationshipSuggestion,
  SchemaTable,
} from '@qube/types';
import { DrizzleService } from '../db/drizzle.service';
import { organizations, projects } from '../db/schema';

type TableRow = {
  table_name: string;
  estimated_rows: string | number | null;
  size_bytes: string | number | null;
};

type ColumnRow = {
  table_name: string;
  column_name: string;
  ordinal: number;
  data_type: string;
  nullable: boolean;
  default_value: string | null;
};

type ConstraintRow = {
  table_name: string;
  constraint_name: string;
  constraint_type: string;
  columns: string[] | null;
  referenced_schema: string | null;
  referenced_table: string | null;
  referenced_columns: string[] | null;
  on_update: string | null;
  on_delete: string | null;
  definition: string;
};

type IndexRow = {
  table_name: string;
  index_name: string;
  columns: string[] | null;
  is_unique: boolean;
  is_primary: boolean;
  is_partial: boolean;
  method: string;
  definition: string;
};

function finiteNumber(value: string | number | null): number | null {
  if (value === null) return null;
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function constraintType(type: string): SchemaConstraintType {
  switch (type) {
    case 'p':
      return 'primary_key';
    case 'f':
      return 'foreign_key';
    case 'u':
      return 'unique';
    default:
      return 'check';
  }
}

function actionName(code: string | null): string | undefined {
  if (!code) return undefined;
  const names: Record<string, string> = {
    a: 'NO ACTION',
    r: 'RESTRICT',
    c: 'CASCADE',
    n: 'SET NULL',
    d: 'SET DEFAULT',
  };
  return names[code];
}

function sameColumns(left: string[], right: string[]): boolean {
  return (
    left.length === right.length && left.every((item) => right.includes(item))
  );
}

export function buildRelationships(tables: SchemaTable[]): {
  relationships: SchemaRelationship[];
  suggestions: SchemaRelationshipSuggestion[];
} {
  const relationships: SchemaRelationship[] = [];

  for (const table of tables) {
    const uniqueKeys = [
      ...table.constraints
        .filter((item) => item.type === 'primary_key' || item.type === 'unique')
        .map((item) => item.columns),
      ...table.indexes
        .filter((item) => item.unique)
        .map((item) => item.columns),
    ];

    for (const foreignKey of table.constraints.filter(
      (item) => item.type === 'foreign_key',
    )) {
      if (!foreignKey.referencedTable || !foreignKey.referencedSchema) continue;
      const localColumns = foreignKey.columns;
      const isUnique = uniqueKeys.some((columns) =>
        sameColumns(columns, localColumns),
      );
      const nullable = localColumns.some(
        (name) =>
          table.columns.find((column) => column.name === name)?.nullable ??
          true,
      );

      relationships.push({
        id: `${table.schema}.${table.name}.${foreignKey.name}`,
        constraintName: foreignKey.name,
        fromSchema: table.schema,
        fromTable: table.name,
        fromColumns: localColumns,
        toSchema: foreignKey.referencedSchema,
        toTable: foreignKey.referencedTable,
        toColumns: foreignKey.referencedColumns ?? [],
        cardinality: isUnique ? 'one_to_one' : 'many_to_one',
        optional: nullable,
        source: 'constraint',
      });
    }
  }

  const suggestions: SchemaRelationshipSuggestion[] = [];
  for (const table of tables.filter((item) => item.isJunctionCandidate)) {
    const foreignKeys = relationships.filter(
      (relationship) =>
        relationship.fromSchema === table.schema &&
        relationship.fromTable === table.name,
    );
    for (let left = 0; left < foreignKeys.length; left += 1) {
      for (let right = left + 1; right < foreignKeys.length; right += 1) {
        const fromTable = foreignKeys[left].toTable;
        const toTable = foreignKeys[right].toTable;
        if (fromTable === toTable) continue;
        suggestions.push({
          id: `${table.schema}.${table.name}:${fromTable}:${toTable}`,
          fromTable,
          toTable,
          throughTable: table.name,
          source: 'inferred',
        });
      }
    }
  }

  return { relationships, suggestions };
}

@Injectable()
export class SchemaIntrospectionService {
  constructor(private readonly drizzle: DrizzleService) {}

  private async getProjectSchema(
    orgSlug: string,
    projectSlug: string,
  ): Promise<string> {
    const [project] = await this.drizzle.db
      .select({ schema: projects.dbSchema })
      .from(projects)
      .innerJoin(organizations, eq(projects.orgId, organizations.id))
      .where(
        and(eq(organizations.slug, orgSlug), eq(projects.slug, projectSlug)),
      )
      .limit(1);

    if (!project) throw new NotFoundException('Project not found');
    return project.schema;
  }

  async getSnapshot(
    orgSlug: string,
    projectSlug: string,
  ): Promise<ProjectSchemaSnapshot> {
    const schema = await this.getProjectSchema(orgSlug, projectSlug);
    const [tableResult, columnResult, constraintResult, indexResult] =
      await Promise.all([
        this.drizzle.db.execute<TableRow>(sql`
        SELECT c.relname AS table_name,
               CASE WHEN c.reltuples < 0 THEN NULL ELSE c.reltuples::bigint END AS estimated_rows,
               pg_total_relation_size(c.oid)::bigint AS size_bytes
        FROM pg_catalog.pg_class c
        JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = ${schema} AND c.relkind IN ('r', 'p')
        ORDER BY c.relname
      `),
        this.drizzle.db.execute<ColumnRow>(sql`
        SELECT c.relname AS table_name,
               a.attname AS column_name,
               a.attnum::int AS ordinal,
               pg_catalog.format_type(a.atttypid, a.atttypmod) AS data_type,
               NOT a.attnotnull AS nullable,
               pg_catalog.pg_get_expr(d.adbin, d.adrelid) AS default_value
        FROM pg_catalog.pg_attribute a
        JOIN pg_catalog.pg_class c ON c.oid = a.attrelid
        JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
        LEFT JOIN pg_catalog.pg_attrdef d
          ON d.adrelid = a.attrelid AND d.adnum = a.attnum
        WHERE n.nspname = ${schema}
          AND c.relkind IN ('r', 'p')
          AND a.attnum > 0
          AND NOT a.attisdropped
        ORDER BY c.relname, a.attnum
      `),
        this.drizzle.db.execute<ConstraintRow>(sql`
        SELECT table_class.relname AS table_name,
               constraint_row.conname AS constraint_name,
               constraint_row.contype AS constraint_type,
               COALESCE(
                 array_agg(local_attribute.attname ORDER BY local_key.ordinality)
                   FILTER (WHERE local_attribute.attname IS NOT NULL),
                 ARRAY[]::name[]
               )::text[] AS columns,
               referenced_namespace.nspname AS referenced_schema,
               referenced_class.relname AS referenced_table,
               COALESCE(
                 array_agg(referenced_attribute.attname ORDER BY local_key.ordinality)
                   FILTER (WHERE referenced_attribute.attname IS NOT NULL),
                 ARRAY[]::name[]
               )::text[] AS referenced_columns,
               constraint_row.confupdtype AS on_update,
               constraint_row.confdeltype AS on_delete,
               pg_catalog.pg_get_constraintdef(constraint_row.oid, true) AS definition
        FROM pg_catalog.pg_constraint constraint_row
        JOIN pg_catalog.pg_class table_class ON table_class.oid = constraint_row.conrelid
        JOIN pg_catalog.pg_namespace table_namespace ON table_namespace.oid = table_class.relnamespace
        LEFT JOIN LATERAL unnest(constraint_row.conkey) WITH ORDINALITY
          AS local_key(attnum, ordinality) ON true
        LEFT JOIN pg_catalog.pg_attribute local_attribute
          ON local_attribute.attrelid = table_class.oid AND local_attribute.attnum = local_key.attnum
        LEFT JOIN pg_catalog.pg_class referenced_class ON referenced_class.oid = constraint_row.confrelid
        LEFT JOIN pg_catalog.pg_namespace referenced_namespace
          ON referenced_namespace.oid = referenced_class.relnamespace
        LEFT JOIN LATERAL unnest(constraint_row.confkey) WITH ORDINALITY
          AS referenced_key(attnum, ordinality) ON referenced_key.ordinality = local_key.ordinality
        LEFT JOIN pg_catalog.pg_attribute referenced_attribute
          ON referenced_attribute.attrelid = referenced_class.oid
         AND referenced_attribute.attnum = referenced_key.attnum
        WHERE table_namespace.nspname = ${schema}
          AND constraint_row.contype IN ('p', 'f', 'u', 'c')
        GROUP BY table_class.relname, constraint_row.oid, referenced_namespace.nspname,
                 referenced_class.relname
        ORDER BY table_class.relname, constraint_row.conname
      `),
        this.drizzle.db.execute<IndexRow>(sql`
        SELECT table_class.relname AS table_name,
               index_class.relname AS index_name,
               ARRAY(
                 SELECT attribute.attname::text
                 FROM unnest(index_row.indkey) WITH ORDINALITY AS index_key(attnum, ordinality)
                 JOIN pg_catalog.pg_attribute attribute
                   ON attribute.attrelid = table_class.oid AND attribute.attnum = index_key.attnum
                 WHERE index_key.ordinality <= index_row.indnkeyatts
                 ORDER BY index_key.ordinality
               ) AS columns,
               index_row.indisunique AS is_unique,
               index_row.indisprimary AS is_primary,
               index_row.indpred IS NOT NULL AS is_partial,
               access_method.amname AS method,
               pg_catalog.pg_get_indexdef(index_row.indexrelid) AS definition
        FROM pg_catalog.pg_index index_row
        JOIN pg_catalog.pg_class table_class ON table_class.oid = index_row.indrelid
        JOIN pg_catalog.pg_namespace table_namespace ON table_namespace.oid = table_class.relnamespace
        JOIN pg_catalog.pg_class index_class ON index_class.oid = index_row.indexrelid
        JOIN pg_catalog.pg_am access_method ON access_method.oid = index_class.relam
        WHERE table_namespace.nspname = ${schema}
        ORDER BY table_class.relname, index_class.relname
      `),
      ]);

    const rowsByTable = new Map<string, TableRow>();
    const columnsByTable = new Map<string, SchemaColumn[]>();
    const constraintsByTable = new Map<string, SchemaConstraint[]>();
    const indexesByTable = new Map<string, SchemaIndex[]>();

    for (const row of tableResult.rows) rowsByTable.set(row.table_name, row);
    for (const row of columnResult.rows) {
      const columns = columnsByTable.get(row.table_name) ?? [];
      columns.push({
        name: row.column_name,
        ordinal: row.ordinal,
        dataType: row.data_type,
        nullable: row.nullable,
        defaultValue: row.default_value,
        primaryKey: false,
        unique: false,
      });
      columnsByTable.set(row.table_name, columns);
    }

    for (const row of constraintResult.rows) {
      const constraint: SchemaConstraint = {
        name: row.constraint_name,
        type: constraintType(row.constraint_type),
        columns: row.columns ?? [],
        definition: row.definition,
      };
      if (row.referenced_schema)
        constraint.referencedSchema = row.referenced_schema;
      if (row.referenced_table)
        constraint.referencedTable = row.referenced_table;
      if (row.referenced_columns?.length)
        constraint.referencedColumns = row.referenced_columns;
      if (row.constraint_type === 'f') {
        constraint.onUpdate = actionName(row.on_update);
        constraint.onDelete = actionName(row.on_delete);
      }
      const constraints = constraintsByTable.get(row.table_name) ?? [];
      constraints.push(constraint);
      constraintsByTable.set(row.table_name, constraints);
    }

    for (const row of indexResult.rows) {
      const indexes = indexesByTable.get(row.table_name) ?? [];
      indexes.push({
        name: row.index_name,
        columns: row.columns ?? [],
        unique: row.is_unique,
        primary: row.is_primary,
        partial: row.is_partial,
        method: row.method,
        definition: row.definition,
      });
      indexesByTable.set(row.table_name, indexes);
    }

    const tables: SchemaTable[] = [...rowsByTable.values()].map((row) => {
      const columns = columnsByTable.get(row.table_name) ?? [];
      const constraints = constraintsByTable.get(row.table_name) ?? [];
      const indexes = indexesByTable.get(row.table_name) ?? [];
      const primaryColumns = new Set(
        constraints
          .filter((item) => item.type === 'primary_key')
          .flatMap((item) => item.columns),
      );
      const individuallyUnique = new Set([
        ...constraints
          .filter(
            (item) => item.type === 'primary_key' && item.columns.length === 1,
          )
          .flatMap((item) => item.columns),
        ...constraints
          .filter((item) => item.type === 'unique' && item.columns.length === 1)
          .flatMap((item) => item.columns),
        ...indexes
          .filter(
            (item) => item.unique && !item.partial && item.columns.length === 1,
          )
          .flatMap((item) => item.columns),
      ]);
      for (const column of columns) {
        column.primaryKey = primaryColumns.has(column.name);
        column.unique = individuallyUnique.has(column.name);
      }

      const foreignKeys = constraints.filter(
        (item) => item.type === 'foreign_key',
      );
      const keyColumns = constraints
        .filter((item) => item.type === 'primary_key' || item.type === 'unique')
        .flatMap((item) => item.columns);
      const foreignKeyColumns = new Set(
        foreignKeys.flatMap((item) => item.columns),
      );
      const isJunctionCandidate =
        foreignKeys.length >= 2 &&
        (keyColumns.length === 0 ||
          [...new Set(keyColumns)].every((name) =>
            foreignKeyColumns.has(name),
          ) ||
          foreignKeyColumns.size >= 2);

      return {
        schema,
        name: row.table_name,
        columns,
        constraints,
        indexes,
        estimatedRows: finiteNumber(row.estimated_rows),
        sizeBytes: finiteNumber(row.size_bytes),
        isJunctionCandidate,
      };
    });

    const { relationships, suggestions } = buildRelationships(tables);
    const normalized = { schema, tables, relationships, suggestions };
    const schemaHash = createHash('sha256')
      .update(JSON.stringify(normalized))
      .digest('hex');

    return {
      ...normalized,
      schemaHash,
      capturedAt: new Date().toISOString(),
    };
  }
}
