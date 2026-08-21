"use client";

import { useState } from "react";
import { Eye, EyeOff, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ProjectApiDocs } from "@qube/types";

export function ApiDocsClient({ docs }: { docs: ProjectApiDocs }) {
  const [showAnonKey, setShowAnonKey] = useState(false);
  const [showServiceKey, setShowServiceKey] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const copyToClipboard = async (text: string, key: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const methodColors: Record<string, string> = {
    GET: "bg-blue-100 text-blue-700",
    POST: "bg-green-100 text-green-700",
    PATCH: "bg-yellow-100 text-yellow-700",
    DELETE: "bg-red-100 text-red-700",
  };

  return (
    <div className="mx-auto w-full min-w-0 max-w-4xl space-y-8 overflow-x-hidden">
      <div>
        <h1 className="text-2xl font-medium">API</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Auto-generated REST endpoints for your project tables
        </p>
      </div>

      <div className="space-y-4">
        <h2 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
          API Keys
        </h2>

        <div className="space-y-1 rounded-xl border border-border p-4">
          <p className="text-xs text-muted-foreground">Project URL</p>
          <div className="flex min-w-0 items-center justify-between gap-2">
            <code className="min-w-0 break-all font-mono text-sm">
              {docs.projectUrl}
            </code>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 shrink-0"
              onClick={() => void copyToClipboard(docs.projectUrl, "url")}
            >
              {copiedKey === "url" ? <Check size={12} /> : <Copy size={12} />}
            </Button>
          </div>
        </div>

        <div className="space-y-1 rounded-xl border border-border p-4">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground">Anon Key</p>
            <p className="shrink-0 text-xs text-muted-foreground">
              Read-only (GET)
            </p>
          </div>
          <div className="flex min-w-0 items-center justify-between gap-2">
            <code className="min-w-0 break-all font-mono text-sm">
              {showAnonKey ? docs.anonKey : "•".repeat(40)}
            </code>
            <div className="flex shrink-0 gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => setShowAnonKey((v) => !v)}
              >
                {showAnonKey ? <EyeOff size={12} /> : <Eye size={12} />}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => void copyToClipboard(docs.anonKey, "anon")}
              >
                {copiedKey === "anon" ? (
                  <Check size={12} />
                ) : (
                  <Copy size={12} />
                )}
              </Button>
            </div>
          </div>
        </div>

        <div className="space-y-1 rounded-xl border border-border p-4">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground">Service Role Key</p>
            <p className="shrink-0 text-xs text-red-500">
              Full access — server only
            </p>
          </div>
          <div className="flex min-w-0 items-center justify-between gap-2">
            <code className="min-w-0 break-all font-mono text-sm">
              {showServiceKey ? docs.serviceRoleKey : "•".repeat(40)}
            </code>
            <div className="flex shrink-0 gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => setShowServiceKey((v) => !v)}
              >
                {showServiceKey ? <EyeOff size={12} /> : <Eye size={12} />}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() =>
                  void copyToClipboard(docs.serviceRoleKey, "service")
                }
              >
                {copiedKey === "service" ? (
                  <Check size={12} />
                ) : (
                  <Copy size={12} />
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {docs.tables.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-16 text-center">
          <p className="text-sm text-muted-foreground">No tables yet</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Create a table in the Table Editor to see its endpoints here
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          <h2 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
            Endpoints
          </h2>
          {docs.tables.map((table) => (
            <div key={table.name} className="min-w-0 space-y-3">
              <h3 className="text-base font-medium">{table.name}</h3>
              <div className="space-y-2">
                {table.endpoints.map((endpoint, i) => (
                  <EndpointCard
                    key={i}
                    endpoint={endpoint}
                    methodColors={methodColors}
                    onCopy={copyToClipboard}
                    copiedKey={copiedKey}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function EndpointCard({
  endpoint,
  methodColors,
  onCopy,
  copiedKey,
}: {
  endpoint: {
    method: string;
    path: string;
    description: string;
    example: string;
  };
  methodColors: Record<string, string>;
  onCopy: (text: string, key: string) => Promise<void>;
  copiedKey: string | null;
}) {
  const [expanded, setExpanded] = useState(false);
  const copyKey = `${endpoint.method}-${endpoint.path}`;

  return (
    <div
      className="min-w-0 cursor-pointer overflow-hidden rounded-xl border border-border"
      onClick={() => setExpanded((v) => !v)}
    >
      <div className="flex min-w-0 items-start gap-3 px-4 py-3 transition-colors hover:bg-accent/50">
        <span
          className={`mt-0.5 shrink-0 rounded px-2 py-0.5 font-mono text-xs font-bold ${methodColors[endpoint.method]}`}
        >
          {endpoint.method}
        </span>
        <div className="min-w-0 flex-1 space-y-1">
          <code className="block break-all font-mono text-sm">
            {endpoint.path}
          </code>
          <p className="text-xs text-muted-foreground">
            {endpoint.description}
          </p>
        </div>
      </div>
      {expanded && (
        <div className="border-t border-border bg-muted/30 px-4 py-3">
          <div className="flex min-w-0 items-start justify-between gap-2">
            <pre className="min-w-0 flex-1 overflow-x-auto whitespace-pre-wrap break-all font-mono text-xs text-muted-foreground">
              {endpoint.example}
            </pre>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 shrink-0"
              onClick={(e) => {
                e.stopPropagation();
                void onCopy(endpoint.example, copyKey);
              }}
            >
              {copiedKey === copyKey ? <Check size={12} /> : <Copy size={12} />}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
