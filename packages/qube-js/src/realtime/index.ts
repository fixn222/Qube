import { io, type Socket } from "socket.io-client";
import type { RealtimeEvent } from "../types";

const REALTME_EVENT = {
  SUBSCRIBE: "subscribe",
  UNSUBSCRIBE: "unsubscribe",
  EVENT: "event",
  ERROR: "error",
} as const;

export type RealtimeCallback = (event: RealtimeEvent) => void;
export type RealtimeConnectionStatus =
  | "connecting"
  | "connected"
  | "disconnected"
  | "error";
export type RealtimeStatusCallback = (
  status: RealtimeConnectionStatus,
  message?: string,
) => void;

function getRealtimeSocketUrl(projectUrl: string): string {
  const origin = new URL(projectUrl).origin;
  return `${origin}/realtime`;
}

export class QubeRealTime {
  private socket: Socket | null = null;

  private callbacks = new Map<string, Set<RealtimeCallback>>();
  private statusCallbacks = new Map<string, Set<RealtimeStatusCallback>>();

  constructor(
    private projectUrl: string,
    private apiKey: string,
  ) {}

  private connect(): Socket {
    if (this.socket) return this.socket;

    this.socket = io(getRealtimeSocketUrl(this.projectUrl), {
      auth: { token: this.apiKey },
      transports: ["websocket", "polling"],
    });

    this.socket.on("connect", () => {
      this.notifyStatus("connected");
      for (const table of this.callbacks.keys()) {
        this.socket?.emit(REALTME_EVENT.SUBSCRIBE, table);
      }
    });

    this.socket.on("connect_error", (error: Error) => {
      this.notifyStatus("error", error.message);
    });

    this.socket.on("disconnect", (reason: string) => {
      this.notifyStatus("disconnected", reason);
    });

    this.socket.on(REALTME_EVENT.EVENT, (event: RealtimeEvent) => {
      const handlers = this.callbacks.get(event.table);
      handlers?.forEach((cb) => cb(event));
    });

    this.socket.on(REALTME_EVENT.ERROR, (msg: string) => {
      console.error("[Qube-js] realtime error:", msg);
      this.notifyStatus("error", msg);
    });

    return this.socket;
  }

  private notifyStatus(
    status: RealtimeConnectionStatus,
    message?: string,
  ): void {
    this.statusCallbacks.forEach((callbacks) => {
      callbacks.forEach((callback) => callback(status, message));
    });
  }

  subscribe(
    table: string,
    callback: RealtimeCallback,
    onStatus?: RealtimeStatusCallback,
  ): () => void {
    const socket = this.connect();

    if (onStatus) {
      if (!this.statusCallbacks.has(table)) {
        this.statusCallbacks.set(table, new Set());
      }
      this.statusCallbacks.get(table)!.add(onStatus);
    }

    const isNewSubscription = !this.callbacks.has(table);
    if (isNewSubscription) {
      this.callbacks.set(table, new Set());
    }

    this.callbacks.get(table)!.add(callback);
    if (isNewSubscription && socket.connected) {
      socket.emit(REALTME_EVENT.SUBSCRIBE, table);
    }
    onStatus?.(socket.connected ? "connected" : "connecting");

    return () => {
      this.unsubscribe(table, callback);
      if (onStatus) {
        const callbacks = this.statusCallbacks.get(table);
        callbacks?.delete(onStatus);
        if (callbacks?.size === 0) this.statusCallbacks.delete(table);
      }
    };
  }

  unsubscribe(table: string, callback?: RealtimeCallback): void {
    if (!callback) {
      this.callbacks.delete(table);
      this.statusCallbacks.delete(table);
      this.socket?.emit(REALTME_EVENT.UNSUBSCRIBE, table);
      return;
    }
    const handlers = this.callbacks.get(table);

    if (!handlers) return;

    handlers.delete(callback);

    if (handlers.size === 0) {
      this.callbacks.delete(table);
      this.socket?.emit(REALTME_EVENT.UNSUBSCRIBE, table);
    }
  }

  disconnect(): void {
    this.socket?.disconnect();
    this.socket = null;
    this.callbacks.clear();
    this.statusCallbacks.clear();
  }
}
