"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Radio, Trash2, Table2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { REALTME_EVENT } from "@qube/constants";
import type { RealtimeEvent } from "@qube/types";

interface RealtimeClientProps {
  orgSlug: string;
  projectSlug: string;
  projectId: string;
  anonKey: string;
  tables: string[];
}

const EVENT_COLORS: Record<string, string> = {
  INSERT: "bg-green-100 text-green-700",
  UPDATE: "bg-yellow-100 text-yellow-700",
  DELETE: "bg-red-100 text-red-700",
};

function getRealtimeSocketBaseUrl(): string {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000/api";
  // WebSocket namespace is NOT under /api
  return apiUrl.replace(/\/api\/?$/, "");
}

export function RealtimeClient({
  orgSlug,
  projectSlug,
  projectId,
  anonKey,
  tables,
}: RealtimeClientProps) {
  const [connected, setConnected] = useState(false);
  const [subscribedTables, setSubscribedTables] = useState<Set<string>>(
    new Set(),
  );
  const [events, setEvents] = useState<(RealtimeEvent & { id: string })[]>([]);
  const socketRef = useRef<Socket | null>(null);
  const subscribedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    subscribedRef.current = subscribedTables;
  }, [subscribedTables]);

  useEffect(() => {
    const socket = io(`${getRealtimeSocketBaseUrl()}/realtime`, {
      auth: { token: anonKey },
      transports: ["websocket", "polling"],
    });

    socket.on("connect", () => {
      setConnected(true);
      // re-subscribe after reconnect
      for (const tableName of subscribedRef.current) {
        socket.emit(REALTME_EVENT.SUBSCRIBE, tableName);
      }
    });

    socket.on("disconnect", () => setConnected(false));

    socket.on(REALTME_EVENT.ERROR, (msg: string) => {
      console.error("Realtime error:", msg);
      setConnected(false);
    });

    socket.on(REALTME_EVENT.EVENT, (event: RealtimeEvent) => {
      setEvents((prev) => [
        { ...event, id: crypto.randomUUID() },
        ...prev.slice(0, 99),
      ]);
    });

    socketRef.current = socket;

    return () => {
      socket.disconnect();
    };
  }, [anonKey]);

  const toggleTable = useCallback(
    async (tableName: string, enabled: boolean) => {
      const socket = socketRef.current;
      if (!socket) return;

      const apiUrl =
        process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000/api";

      if (enabled) {
        const res = await fetch(
          `${apiUrl}/orgs/${orgSlug}/projects/${projectSlug}/realtime/${tableName}/enable`,
          { method: "POST", credentials: "include" },
        );

        if (!res.ok) return;

        socket.emit(REALTME_EVENT.SUBSCRIBE, tableName);
        setSubscribedTables((prev) => new Set([...prev, tableName]));
      } else {
        socket.emit(REALTME_EVENT.UNSUBSCRIBE, tableName);
        setSubscribedTables((prev) => {
          const next = new Set(prev);
          next.delete(tableName);
          return next;
        });

        await fetch(
          `${apiUrl}/orgs/${orgSlug}/projects/${projectSlug}/realtime/${tableName}/disable`,
          { method: "DELETE", credentials: "include" },
        );
      }
    },
    [orgSlug, projectSlug],
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-medium">Realtime</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Subscribe to table changes and see them broadcast live
        </p>
      </div>

      <div className="flex items-center gap-2">
        <div
          className={cn(
            "h-2 w-2 rounded-full",
            connected ? "bg-green-500" : "bg-red-500",
          )}
        />
        <span className="text-sm text-muted-foreground">
          {connected ? "Connected" : "Disconnected"}
        </span>
        <Radio
          size={14}
          className={cn(
            "ml-1",
            connected ? "text-green-500" : "text-muted-foreground",
          )}
        />
        <span className="ml-2 font-mono text-xs text-muted-foreground">
          project:{projectId}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-3 lg:col-span-1">
          <h2 className="text-sm font-medium">Tables</h2>

          {tables.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No tables yet — create one in the Table Editor
            </p>
          ) : (
            <div className="space-y-2">
              {tables.map((table) => (
                <div
                  key={table}
                  className="flex items-center justify-between rounded-xl border border-border p-3"
                >
                  <div className="flex items-center gap-2">
                    <Table2 size={14} className="text-muted-foreground" />
                    <span className="font-mono text-sm">{table}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "text-xs font-medium",
                        subscribedTables.has(table)
                          ? "text-green-600"
                          : "text-muted-foreground",
                      )}
                    >
                      {subscribedTables.has(table) ? "Listening" : "Off"}
                    </span>
                    <Switch
                      checked={subscribedTables.has(table)}
                      onCheckedChange={(checked) =>
                        void toggleTable(table, checked)
                      }
                      disabled={!connected}
                      className="h-6 w-11 shrink-0 border border-border shadow-sm data-[state=checked]:bg-primary data-[state=unchecked]:bg-neutral-300 data-[state=unchecked]:dark:bg-neutral-600 [&_[data-slot=switch-thumb]]:size-5 [&_[data-slot=switch-thumb]]:bg-white [&_[data-slot=switch-thumb]]:shadow"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-3 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium">
              Event Feed
              {events.length > 0 && (
                <span className="ml-2 font-normal text-muted-foreground">
                  ({events.length})
                </span>
              )}
            </h2>
            {events.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5 text-muted-foreground"
                onClick={() => setEvents([])}
              >
                <Trash2 size={12} />
                Clear
              </Button>
            )}
          </div>

          {subscribedTables.size === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-16 text-center">
              <Radio size={24} className="mb-3 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Toggle a table to start listening
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Events will appear here in real time
              </p>
            </div>
          ) : events.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-16 text-center">
              <div className="mb-3 flex gap-1">
                <div
                  className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground"
                  style={{ animationDelay: "0ms" }}
                />
                <div
                  className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground"
                  style={{ animationDelay: "150ms" }}
                />
                <div
                  className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground"
                  style={{ animationDelay: "300ms" }}
                />
              </div>
              <p className="text-sm text-muted-foreground">
                Listening for changes...
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Insert, update, or delete a row to see an event
              </p>
            </div>
          ) : (
            <ScrollArea className="h-[500px] rounded-xl border border-border">
              <div className="divide-y divide-border">
                {events.map((event) => (
                  <div key={event.id} className="space-y-2 px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="secondary"
                        className={cn(
                          "font-mono text-xs font-bold",
                          EVENT_COLORS[event.type],
                        )}
                      >
                        {event.type}
                      </Badge>
                      <span className="font-mono text-sm text-muted-foreground">
                        {event.table}
                      </span>
                      <span className="ml-auto text-xs text-muted-foreground">
                        {new Date(
                          event.timestamp ?? event.timeStamp ?? Date.now(),
                        ).toLocaleTimeString()}
                      </span>
                    </div>
                    <pre className="overflow-x-auto rounded-lg bg-muted p-2 font-mono text-xs">
                      {JSON.stringify(event.record, null, 2)}
                    </pre>
                    {event.oldRecord && (
                      <pre className="overflow-x-auto rounded-lg bg-muted/50 p-2 font-mono text-xs text-muted-foreground">
                        {JSON.stringify(event.oldRecord, null, 2)}
                      </pre>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>
      </div>
    </div>
  );
}
