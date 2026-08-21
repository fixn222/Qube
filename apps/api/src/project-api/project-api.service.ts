import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DrizzleService } from '../db/drizzle.service';
import { projects } from '../db/schema';
import {
  buildWhereClause,
  ParsedQuery,
  parseQueryParams,
} from './query-parser';

@Injectable()
export class ProjectApiService {
  constructor(private drizzle: DrizzleService) {}
  private assertSafeIdentifier(name: string, label: string): void {
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name)) {
      throw new BadRequestException(`Invalid ${label}: ${name}`);
    }
  }

  private formateliteral(value: unknown): string {
    if (value === null || value === undefined) return 'NULL';

    if (value === 'boolen') return value ? 'TRUE' : 'FALSE';

    if (typeof value === 'number' && Number.isFinite(value)) {
      return String(value);
    }

    if (typeof value === 'string') {
      return `'${value.replace(/'/g, "''")}'`;
    }

    if (typeof value === 'object') {
      return `'${JSON.stringify(value).replace(/'/g, "''")}'::jsonb`;
    }

    throw new BadRequestException('Unsupported column value');
  }

  async resolveProjectSchema(
    projectId: string,
    projectSlug: string,
  ): Promise<string> {
    const [project] = await this.drizzle.db
      .select({ dbSchema: projects.dbSchema, slug: projects.slug })
      .from(projects)
      .where(eq(projects.id, projectId))
      .limit(1);

    if (!project) throw new NotFoundException('Project not found');

    if (project.slug !== projectSlug) {
      throw new ForbiddenException('API key does not match this project URL');
    }

    return project.dbSchema;
  }
  private async getPrimaryKeyCol(
    schema: string,
    tableName: string,
  ): Promise<string> {
    const result = await this.drizzle.db.execute<{ column_name: string }>(
      `SELECT kcu.column_name
       FROM information_schema.table_constraints tc
       JOIN information_schema.key_column_usage kcu
         ON tc.constraint_name = kcu.constraint_name
         AND tc.table_schema = kcu.table_schema
       WHERE tc.constraint_type = 'PRIMARY KEY'
         AND tc.table_schema = '${schema}'
         AND tc.table_name = '${tableName}'
       ORDER BY kcu.ordinal_position ASC
       LIMIT 1`,
    );

    const pk = result.rows[0]?.column_name;

    if (!pk) {
      throw new BadRequestException(`Table "${tableName}" has no primary key`);
    }

    return pk;
  }

  async getRows(
    projectId: string,
    projectSlug: string,
    tableName: string,
    rawParams: Record<string, string>,
  ) {
    this.assertSafeIdentifier(tableName, 'table name');

    const schema = await this.resolveProjectSchema(projectId, projectSlug);
    const { select, filters, orderBy, limit, offset } =
      parseQueryParams(rawParams);

    const col =
      select.length > 0 ? select.map((c) => `"${c}"`).join(', ') : '*';

    const where = buildWhereClause(filters);
    const order = orderBy
      ? `ORDER BY "${orderBy.column}" ${orderBy.directions}`
      : '';

    const sql = `
                  SELECT ${col} 
                  FROM "${schema}"."${tableName}"
                  ${where}
                  ${order}
                  LIMIT ${limit}
                  OFFSET ${offset}`;
    const result = await this.drizzle.db.execute<Record<string, unknown>>(sql);

    return result.rows;
  }

  async insertRow(
    projectId: string,
    projectSlug: string,
    tableName: string,
    body: Record<string, unknown>,
  ) {
    this.assertSafeIdentifier(tableName, 'table name');
    const schema = await this.resolveProjectSchema(projectId, projectSlug);

    const entries = Object.entries(body);
    if (entries.length === 0) {
      throw new BadRequestException('Request body cannot be empty');
    }

    entries.forEach(([col]) => this.assertSafeIdentifier(col, 'column name'));

    const column = entries.map(([c]) => `"${c}"`).join(', ');

    const values = entries.map(([, v]) => this.formateliteral(v)).join('. ');

    const sql = `INSERT INTO "${schema}"."${tableName}" (${column})
    VALUES (${values}) 
    RETURNING *`;

    const result = await this.drizzle.db.execute<Record<string, unknown>>(sql);

    return result.rows[0];
  }

  async updateRow(
    projectSlug: string,
    projectId: string,
    tableName: string,
    rowId: string,
    body: Record<string, unknown>,
  ) {
    this.assertSafeIdentifier(tableName, 'table name');

    const schema = await this.resolveProjectSchema(projectId, projectSlug);
    const pkCol = await this.getPrimaryKeyCol(schema, tableName);

    const entries = Object.entries(body);
    if (entries.length === 0) {
      throw new BadRequestException('Request cannot be empty');
    }

    entries.forEach(([col]) => this.assertSafeIdentifier(col, 'column name'));

    const setClauses = entries
      .map(([col, val]) => `"${col}" = ${this.formateliteral(val)}`)
      .join(', ');

    const sql = `
      UPDATE "${schema}"."${tableName}"
      SET ${setClauses}
      WHERE "${pkCol}" = ${this.formateliteral(rowId)}
      RETURNING *
    `;

    const result = await this.drizzle.db.execute<Record<string, unknown>>(sql);
    if (!result.rows[0]) throw new NotFoundException('Row not found');
    return result.rows[0];
  }

  async deleteRow(
    projectId: string,
    projectSlug: string,
    tableName: string,
    rowId: string,
  ) {
    this.assertSafeIdentifier(tableName, 'table name');
    const schema = await this.resolveProjectSchema(projectId, projectSlug);
    const pkColumn = await this.getPrimaryKeyCol(schema, tableName);

    const sql = `
      DELETE FROM "${schema}"."${tableName}"
      WHERE "${pkColumn}" = ${this.formateliteral(rowId)}
      RETURNING *
    `;

    const result = await this.drizzle.db.execute<Record<string, unknown>>(sql);
    if (!result.rows[0]) throw new NotFoundException('Row not found');
    return result.rows[0];
  }
}
