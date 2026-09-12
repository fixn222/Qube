import { BadRequestException, Injectable } from '@nestjs/common';
import { DrizzleService } from 'src/db/drizzle.service';

@Injectable()
export class TrigerService {
  constructor(private drizzle: DrizzleService) {}

  private assertSafeIdentifier(name: string, label: string): void {
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name)) {
      throw new BadRequestException(`Invalid ${label}: ${name}`);
    }
  }

  static channelName(projectId: string, tableName: string): string {
    return `project_${projectId.replace(/-/g, '')}_${tableName}`;
  }

  async enableRealtime(
    dbSchema: string,
    projectId: string,
    tableName: string,
  ): Promise<void> {
    this.assertSafeIdentifier(dbSchema, 'schema name');
    this.assertSafeIdentifier(tableName, 'table name');

    const channel = TrigerService.channelName(projectId, tableName);
    const fnName = `${tableName}_notify`;

    await this.drizzle.db.execute(`

 CREATE OR REPLACE FUNCTION "${dbSchema}"."${fnName}"()
      RETURNS TRIGGER AS $$
      DECLARE
        payload JSON;
      BEGIN
        IF TG_OP = 'DELETE' THEN
          payload = json_build_object(
            'type', TG_OP,
            'table', TG_TABLE_NAME,
            'record', row_to_json(OLD),
            'oldRecord', row_to_json(OLD),
            'projectId', '${projectId}',
            'timestamp', now()::text
          );
          PERFORM pg_notify('${channel}', payload::text);
          RETURN OLD;
        ELSIF TG_OP = 'UPDATE' THEN
          payload = json_build_object(
            'type', TG_OP,
            'table', TG_TABLE_NAME,
            'record', row_to_json(NEW),
            'oldRecord', row_to_json(OLD),
            'projectId', '${projectId}',
            'timestamp', now()::text
          );
          PERFORM pg_notify('${channel}', payload::text);
          RETURN NEW;
        ELSE
          payload = json_build_object(
    'type', TG_OP,
            'table', TG_TABLE_NAME,
            'record', row_to_json(NEW),
            'projectId', '${projectId}',
            'timestamp', now()::text
          );
          PERFORM pg_notify('${channel}', payload::text);
          RETURN NEW;
        END IF;
      END;
      $$ LANGUAGE plpgsql;

`);

    await this.drizzle.db.execute(`
    DROP TRIGGER IF EXISTS "${tableName}_realtime_trigger"
    ON "${dbSchema}"."${tableName}"
`);

    await this.drizzle.db.execute(`
      CREATE TRIGGER "${tableName}_realtime_trigger"
      AFTER INSERT OR UPDATE OR DELETE
      ON "${dbSchema}"."${tableName}"
      FOR EACH ROW
      EXECUTE FUNCTION "${dbSchema}"."${fnName}"();
    `);
  }

  async disableRealTime(dbSchema: string, tableName: string): Promise<void> {
    this.assertSafeIdentifier(dbSchema, 'schema name');
    this.assertSafeIdentifier(tableName, 'table name');

    await this.drizzle.db.execute(`
    
    DROP TRIGGER IF EXISTS "${tableName}_realtime_trigger"
    ON "${dbSchema}"."${tableName}";

`);
  }
}
