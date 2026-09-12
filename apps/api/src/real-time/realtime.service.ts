import { Client, neonConfig } from '@neondatabase/serverless';
import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RealtimeEvent } from '@qube/types';
import { TrigerService } from './trigger.service';
import ws from 'ws';

neonConfig.webSocketConstructor = ws;

type NotifyCallBack = (event: RealtimeEvent) => void;

@Injectable()
export class RealtimeService implements OnModuleDestroy {
  private listners = new Map<
    string,
    {
      client: Client;
      callback: Set<NotifyCallBack>;
    }
  >();

  constructor(private config: ConfigService) {}

  private getListenConnectionString(): string {
    const realtime = this.config.get<string>('REALTIME_DATABASE_URL');
    const database = this.config.get<string>('DATABASE_URL');

    const url = realtime ?? database;

    if (!url) {
      throw new Error(`DATABASE_URL not configured `);
    }

    let clean = url.replace('-pooler', '').trim();
    clean = clean.replace(/([?&])(sslmode|channel_binding)=[^&]*/g, '$1');
    clean = clean.replace(/[?&]$/, '').replace(/\?&/, '?');
    return clean;
  }

  async subscribe(
    projectId: string,
    tableName: string,
    callback: NotifyCallBack,
  ): Promise<void> {
    const channel = TrigerService.channelName(projectId, tableName);

    const existing = this.listners.get(channel);

    if (existing) {
      existing.callback.add(callback);

      return;
    }

    const client = new Client({
      connectionString: this.getListenConnectionString(),
    });

    await client.connect();

    client.on('error', (err) => {
      console.error(`Postgres realtime client error on ${channel}:`, err);
    });

    client.on('notification', (msg) => {
      if (!msg.payload) {
        return;
      }

      try {
        const event = JSON.parse(msg.payload) as RealtimeEvent;
        const entry = this.listners.get(channel);
        entry?.callback.forEach((cb) => cb(event));
      } catch (err) {
        console.error(`Failed to parse notification payload on ${channel}:`, err);
      }
    });

    await client.query(`LISTEN "${channel}"`);

    this.listners.set(channel, {
      client,
      callback: new Set([callback]),
    });
  }

  unsubscribe(
    projectId: string,
    tableName: string,
    callback: NotifyCallBack,
  ): void {
    const channel = TrigerService.channelName(projectId, tableName);
    const entry = this.listners.get(channel);
    if (!entry) return;

    entry.callback.delete(callback);

    if (entry.callback.size === 0) {
      void entry.client.query(`UNLISTEN "${channel}"`).finally(() => {
        void entry.client.end();
      });
      this.listners.delete(channel);
    }
  }

  async onModuleDestroy() {
    await Promise.all(
      [...this.listners.values()].map(({ client }) => client.end()),
    );
    this.listners.clear();
  }
}
