/** A change emitted by the Qube realtime API. */
export type RealtimeEventType = "INSERT" | "UPDATE" | "DELETE";

export interface RealtimeEvent {
  type: RealtimeEventType;
  table: string;
  record: Record<string, unknown>;
  oldRecord?: Record<string, unknown>;
  projectId: string;
  timestamp: string;
  timeStamp?: string;
}

/** Metadata for an object stored in a Qube bucket. */
export interface StorageObject {
  id: string;
  bucketId: string;
  size: number;
  name: string;
  mimeType: string;
  utKey: string;
  url: string;
  cratedAt: string;
}
