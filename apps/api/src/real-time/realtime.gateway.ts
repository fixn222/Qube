import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
// import { DrizzleService } from 'src/db/drizzle.service';
import { ConfigService } from '@nestjs/config';
import { PROJECT_KEY_ROLE, REALTME_EVENT } from '@qube/constants';
import { ProjectKeyPayload } from 'src/project-api/project-key.guard';
import { Socket } from 'socket.io';
import { RealtimeEvent } from '@qube/types';
// import { table } from 'console';
import { RealtimeService } from './realtime.service';
import type { RealtimeSocket } from './realtime-socket.types';

type SocketCallbackEntry = {
  projectId: string;
  tableName: string;
  callback: (evnt: RealtimeEvent) => void;
};

@WebSocketGateway({
  namespace: '/realtime',
  cors: {
    origin: process.env.WEB_URL ?? 'http://localhost:3001',
    credentials: true,
  },
})
export class RealtimeGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server!: Server;

  private socketCallbacks = new Map<string, SocketCallbackEntry[]>();

  constructor(
    private realtimeService: RealtimeService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async handleConnection(client: RealtimeSocket) {
    const token = client.handshake.auth['token'] as string | undefined;

    if (!token) {
      client.emit(REALTME_EVENT.ERROR, 'Missing an API key');
      client.disconnect();
      return;
    }

    try {
      const payload = this.jwtService.verify<ProjectKeyPayload>(token, {
        secret: this.configService.get<string>('PROJECT_JWT_SECRET'),
      });

      if (
        payload.role !== PROJECT_KEY_ROLE.ANON &&
        payload.role !== PROJECT_KEY_ROLE.SERVICE_ROLE
      ) {
        throw new Error(`Invalid key role`);
      }

      client.data.projectId = payload.projectId;
      client.data.role = payload.role;

      await client.join(`project:${payload.projectId}`);
    } catch (e) {
      client.emit(REALTME_EVENT.ERROR, `Invalid API key`);

      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const callbacks = this.socketCallbacks.get(client.id) ?? [];
    for (const { projectId, tableName, callback } of callbacks) {
      this.realtimeService.unsubscribe(projectId, tableName, callback as any);
    }
    this.socketCallbacks.delete(client.id);
  }
  @SubscribeMessage(REALTME_EVENT.SUBSCRIBE)
  async handleSubscribe(
    @ConnectedSocket() client: RealtimeSocket,
    @MessageBody() tableName: string,
  ) {
    const projectId = client.data.projectId;

    const normalizedTable = tableName.trim();
    const room = `project: ${projectId}:table:${normalizedTable}`;

    if (!projectId || tableName?.trim()) return;

    const existing = this.socketCallbacks.get(client.id) ?? [];

    if (
      existing.some(
        (entry) =>
          entry.projectId === projectId && entry.tableName === normalizedTable,
      )
    ) {
      return;
    }

    await client.join(room);

    const callback = (event: RealtimeEvent) => {
      this.server.to(room).emit(REALTME_EVENT.EVENT, event);
    };
    await this.realtimeService.subscribe(
      projectId,
      normalizedTable,
      callback as any,
    );

    existing.push({
      projectId,
      tableName: normalizedTable,
      callback,
    });

    this.socketCallbacks.set(client.id, existing);
  }

  @SubscribeMessage(REALTME_EVENT.UNSUBSCRIBE)
  async handleUnsubscribe(
    @ConnectedSocket() client: RealtimeSocket,
    @MessageBody() tableName: string,
  ) {
    const projectId = client.data.projectId;

    if (!projectId || !tableName?.trim()) return;

    const normalizedTable = tableName.trim();
    const room = `project:${projectId}:table:${normalizedTable}`;

    await client.leave(room);

    const callbacks = this.socketCallbacks.get(client.id) ?? [];
    const entry = callbacks.find(
      (c) => c.projectId === projectId && c.tableName === normalizedTable,
    );

    if (entry) {
      this.realtimeService.unsubscribe(
        projectId,
        normalizedTable,
        entry.callback,
      );
      this.socketCallbacks.set(
        client.id,
        callbacks.filter((c) => c !== entry),
      );
    }
  }
}
