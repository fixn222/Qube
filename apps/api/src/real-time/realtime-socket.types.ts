import type { DefaultEventsMap, Socket } from 'socket.io';
import type { PROJECT_KEY_ROLE } from '@qube/constants';

export interface RealtimeSocketData {
  projectId?: string;
  role?: (typeof PROJECT_KEY_ROLE)[keyof typeof PROJECT_KEY_ROLE];
}

export type RealtimeSocket = Socket<
  DefaultEventsMap,
  DefaultEventsMap,
  DefaultEventsMap,
  RealtimeSocketData
>;
