import { QubeClient } from './client';

export function createClient(
  projectUrl: string,
  apiKey: string,
): QubeClient {
  return new QubeClient(projectUrl, apiKey);
}

export { QubeClient } from './client';
export { QueryBuilder, QubeDb } from './db';
export type { QueryResult } from './db';
export { QubeRealTime } from './realtime';
export type {
  RealtimeCallback,
  RealtimeConnectionStatus,
  RealtimeStatusCallback,
} from './realtime';
export type { RealtimeEvent, StorageObject } from './types';
export { QubeStorage } from './storage';
export { QubeAuth } from './auth';
