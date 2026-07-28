import { Injectable, OnModuleInit } from '@nestjs/common';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class DrizzleService implements OnModuleInit {
  public db!: ReturnType<typeof drizzle<typeof schema>>;

  constructor(private config: ConfigService) {}

  onModuleInit() {
    const databaseUrl = this.config.get<string>('DATABASE_URL')!;
    this.db = drizzle(databaseUrl, { schema });
  }
}
