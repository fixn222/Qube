'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import type { OnMount } from '@monaco-editor/react';
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from '@/components/ui/resizable';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Play, Clock, History, X } from 'lucide-react';
import type { QueryResult, QueryHistorItem } from '@qube/types';

const MonacoEditor = dynamic(() => import('@monaco-editor/react'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
      Loading editor...
    </div>
  ),
});

function formatCellValue(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

interface SqlEditorClientProps {
  orgSlug: string;
  projectSlug: string;
  initialHistory: QueryHistorItem[];
}

export function SqlEditorClient({
  orgSlug,
  projectSlug,
  initialHistory,
}: SqlEditorClientProps) {
  const [sql, setSql] = useState('SELECT * FROM users LIMIT 10;');
  const [result, setResult] = useState<QueryResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<QueryHistorItem[]>(initialHistory);
  const [showHistory, setShowHistory] = useState(false);
  const runQueryRef = useRef<() => Promise<void>>(async () => {});

  const runQuery = useCallback(
    async (queryToRun?: string) => {
      const query = queryToRun ?? sql;
      if (!query.trim()) return;

      setLoading(true);
      setError(null);
      setResult(null);

      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/orgs/${orgSlug}/projects/${projectSlug}/sql`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ sql: query }),
          },
        );

        const data = (await res.json()) as QueryResult | { message: string };

        if (!res.ok) {
          setError((data as { message: string }).message ?? 'Query failed');
          return;
        }

        const queryResult = data as QueryResult;
        setResult(queryResult);

        setHistory((prev) => [
          {
            id: crypto.randomUUID(),
            projectId: projectSlug,
            sql: query,
            executionTimeMs: queryResult.executionTimeMs,
            rowCount: queryResult.rowCount,
            createdAt: new Date().toISOString(),
          },
          ...prev,
        ]);
      } catch {
        setError('Failed to connect to the server');
      } finally {
        setLoading(false);
      }
    },
    [sql, orgSlug, projectSlug],
  );

  useEffect(() => {
    runQueryRef.current = runQuery;
  }, [runQuery]);

  const handleEditorMount: OnMount = (editorInstance) => {
    editorInstance.addCommand(2048 | 3, () => void runQueryRef.current());
  };

  return (
    <div className="relative flex h-full min-h-0 w-full min-w-0 overflow-hidden">
      <ResizablePanelGroup
        orientation="vertical"
        className="h-full min-h-0 min-w-0 flex-1"
      >
        <ResizablePanel defaultSize={45} minSize={20} className="min-h-0">
          <div className="flex h-full min-h-0 flex-col">
            <div className="flex shrink-0 items-center justify-between border-b border-border bg-background px-4 py-2">
              <span className="text-sm font-medium">SQL Editor</span>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowHistory((v) => !v)}
                  className="gap-1.5"
                >
                  <History size={14} />
                  History
                </Button>
                <Button
                  size="sm"
                  onClick={() => void runQuery()}
                  disabled={loading}
                  className="gap-1.5"
                >
                  <Play size={12} />
                  {loading ? 'Running...' : 'Run'}
                  <span className="ml-1 text-xs opacity-60">⌘↵</span>
                </Button>
              </div>
            </div>

            <div className="relative min-h-0 flex-1 overflow-hidden">
              <MonacoEditor
                height="100%"
                language="sql"
                value={sql}
                onChange={(v) => setSql(v ?? '')}
                onMount={handleEditorMount}
                theme="vs"
                className="absolute inset-0"
                options={{
                  minimap: { enabled: false },
                  fontSize: 13,
                  fontFamily: 'var(--font-mono)',
                  lineNumbers: 'on',
                  scrollBeyondLastLine: false,
                  automaticLayout: true,
                  padding: { top: 12, bottom: 12 },
                  wordWrap: 'on',
                }}
              />
            </div>
          </div>
        </ResizablePanel>

        <ResizableHandle />

        <ResizablePanel defaultSize={55} minSize={20} className="min-h-0">
          <div className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden bg-background">
            {result && (
              <div className="flex shrink-0 items-center gap-3 border-b border-border px-4 py-2 text-xs text-muted-foreground">
                <span>
                  {result.command &&
                  result.rows.length === 0 &&
                  result.command !== 'SELECT'
                    ? `${result.rowCount} ${result.rowCount === 1 ? 'row' : 'rows'} affected`
                    : `${result.rowCount} ${result.rowCount === 1 ? 'row' : 'rows'}`}
                </span>
                <span>·</span>
                <span className="flex items-center gap-1">
                  <Clock size={10} />
                  {result.executionTimeMs}ms
                </span>
              </div>
            )}

            {error && (
              <div className="shrink-0 border-b border-destructive/20 bg-destructive/10 px-4 py-3">
                <p className="break-all font-mono text-xs text-destructive">
                  {error}
                </p>
              </div>
            )}

            {!result && !error && (
              <div className="flex flex-1 flex-col items-center justify-center text-center">
                <p className="text-sm text-muted-foreground">
                  Run a query to see results
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Press{' '}
                  <kbd className="rounded border border-border px-1 py-0.5 font-mono text-xs">
                    ⌘↵
                  </kbd>{' '}
                  to run
                </p>
              </div>
            )}

            {result && result.rows.length === 0 && (
              <div className="flex flex-1 items-center justify-center">
                <p className="text-sm text-muted-foreground">
                  Query returned 0 rows
                </p>
              </div>
            )}

            {result && result.rows.length > 0 && (
              <div className="min-h-0 min-w-0 flex-1 overflow-auto">
                <Table className="w-full table-fixed">
                  <TableHeader className="sticky top-0 z-10 bg-background">
                    <TableRow>
                      {result.columns.map((col) => (
                        <TableHead
                          key={col}
                          className="max-w-0 border-r border-border text-xs"
                        >
                          <span className="block truncate" title={col}>
                            {col}
                          </span>
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {result.rows.map((row, i) => (
                      <TableRow key={i}>
                        {result.columns.map((col) => {
                          const value = formatCellValue(row[col]);

                          return (
                            <TableCell
                              key={col}
                              className="max-w-0 border-r border-border py-1.5 font-mono text-xs align-top"
                              title={value}
                            >
                              {row[col] === null ? (
                                <span className="italic text-muted-foreground">
                                  NULL
                                </span>
                              ) : (
                                <span className="block truncate">{value}</span>
                              )}
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>

      {showHistory && (
        <div className="absolute inset-y-0 right-0 z-20 flex h-full w-80 flex-col border-l border-border bg-background shadow-lg">
          <div className="flex shrink-0 items-center justify-between border-b border-border px-4 py-3">
            <span className="text-sm font-medium">Query History</span>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => setShowHistory(false)}
            >
              <X size={12} />
            </Button>
          </div>
          <div className="min-h-0 flex-1 overflow-auto">
            {history.length === 0 ? (
              <p className="py-8 text-center text-xs text-muted-foreground">
                No queries yet
              </p>
            ) : (
              <div className="divide-y divide-border">
                {history.map((item) => (
                  <button
                    key={item.id}
                    className="w-full px-4 py-3 text-left transition-colors hover:bg-accent"
                    onClick={() => {
                      setSql(item.sql);
                      setShowHistory(false);
                    }}
                  >
                    <p
                      className="line-clamp-3 font-mono text-xs text-foreground"
                      title={item.sql}
                    >
                      {item.sql}
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
                      <span>{item.rowCount} rows</span>
                      <span>·</span>
                      <span>{item.executionTimeMs}ms</span>
                      <span>·</span>
                      <span>
                        {new Date(item.createdAt).toLocaleTimeString()}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
