'use client';

import {
  applyNodeChanges,
  Background,
  Controls,
  Handle,
  MiniMap,
  MarkerType,
  Position,
  ReactFlow,
  type Edge,
  type Node,
  type NodeChange,
  type NodeProps,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  AlertCircle,
  ArrowDownToLine,
  ArrowLeftRight,
  Database,
  GitBranch,
  KeyRound,
  LoaderCircle,
  RefreshCw,
  Search,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type {
  ProjectSchemaSnapshot,
  SchemaRelationship,
  SchemaRelationshipSuggestion,
  SchemaTable,
} from '@qube/types';

type TableNodeData = {
  table: SchemaTable;
  focused: boolean;
  dimmed: boolean;
};

type SchemaNode = Node<TableNodeData, 'schemaTable'>;
type DiagramEdge = Edge<{ relation: SchemaRelationship | SchemaRelationshipSuggestion }>;
type SelectedRelation = SchemaRelationship | SchemaRelationshipSuggestion;

function TableNode({ data }: NodeProps<SchemaNode>) {
  const primaryKey = data.table.constraints.find((item) => item.type === 'primary_key');
  const previewColumns = data.table.columns.slice(0, 5);

  return (
    <div
      className={`w-[270px] overflow-hidden rounded-xl border bg-card shadow-md transition-all ${
        data.focused ? 'border-primary ring-2 ring-primary/25' : 'border-border'
      } ${data.dimmed ? 'opacity-30' : 'opacity-100'}`}
    >
      <Handle type="target" position={Position.Left} />
      <Handle type="source" position={Position.Right} />
      <div className="flex items-center justify-between gap-3 border-b bg-muted/50 px-3 py-2.5">
        <div className="flex min-w-0 items-center gap-2">
          <Database size={14} className="shrink-0 text-primary" />
          <span className="truncate text-sm font-semibold">{data.table.name}</span>
        </div>
        <span className="shrink-0 text-[10px] text-muted-foreground">
          {data.table.estimatedRows === null
            ? 'rows unavailable'
            : `~${data.table.estimatedRows.toLocaleString()} rows`}
        </span>
      </div>
      <div className="divide-y divide-border/70">
        {previewColumns.map((column) => (
          <div key={column.name} className="flex items-center gap-2 px-3 py-1.5 text-xs">
            {column.primaryKey ? (
              <KeyRound size={11} className="shrink-0 text-amber-500" />
            ) : column.unique ? (
              <span className="w-[11px] shrink-0 text-center text-[9px] font-bold text-amber-500">U</span>
            ) : (
              <span className="w-[11px] shrink-0" />
            )}
            <span className="min-w-0 flex-1 truncate font-mono">{column.name}</span>
            <span className="max-w-[110px] truncate font-mono text-[10px] text-muted-foreground">
              {column.dataType}{column.nullable ? '?' : ''}
            </span>
          </div>
        ))}
      </div>
      {data.table.columns.length > previewColumns.length && (
        <div className="border-t px-3 py-1 text-[10px] text-muted-foreground">
          +{data.table.columns.length - previewColumns.length} more columns
        </div>
      )}
      <div className="flex gap-2 border-t bg-muted/30 px-3 py-1.5 text-[10px] text-muted-foreground">
        <span>{data.table.columns.length} columns</span>
        <span>·</span>
        <span>{data.table.indexes.length} indexes</span>
        {primaryKey && <><span>·</span><span>PK</span></>}
      </div>
    </div>
  );
}

const nodeTypes = { schemaTable: TableNode };

function layoutTables(
  tables: SchemaTable[],
  relationships: SchemaRelationship[],
  grouped: boolean,
): Map<string, { x: number; y: number }> {
  const positions = new Map<string, { x: number; y: number }>();
  if (grouped) {
    const schemas = [...new Set(tables.map((table) => table.schema))].sort();
    for (const [schemaIndex, schema] of schemas.entries()) {
      tables
        .filter((table) => table.schema === schema)
        .forEach((table, index) => {
          positions.set(`${table.schema}.${table.name}`, {
            x: schemaIndex * 700 + (index % 2) * 340,
            y: Math.floor(index / 2) * 260,
          });
        });
    }
    return positions;
  }

  const adjacency = new Map<string, Set<string>>();
  for (const table of tables) adjacency.set(`${table.schema}.${table.name}`, new Set());
  for (const relationship of relationships) {
    const from = `${relationship.fromSchema}.${relationship.fromTable}`;
    const to = `${relationship.toSchema}.${relationship.toTable}`;
    adjacency.get(from)?.add(to);
    adjacency.get(to)?.add(from);
  }

  const visited = new Set<string>();
  let componentOffset = 0;
  const tableIds = [...adjacency.keys()].sort((left, right) => {
    const degree = (adjacency.get(right)?.size ?? 0) - (adjacency.get(left)?.size ?? 0);
    return degree || left.localeCompare(right);
  });

  for (const start of tableIds) {
    if (visited.has(start)) continue;
    const queue = [{ id: start, depth: 0 }];
    const depthRows = new Map<number, string[]>();
    visited.add(start);
    while (queue.length) {
      const current = queue.shift()!;
      const row = depthRows.get(current.depth) ?? [];
      row.push(current.id);
      depthRows.set(current.depth, row);
      for (const neighbor of adjacency.get(current.id) ?? []) {
        if (visited.has(neighbor)) continue;
        visited.add(neighbor);
        queue.push({ id: neighbor, depth: current.depth + 1 });
      }
    }
    let componentHeight = 0;
    for (const [depth, ids] of depthRows) {
      ids.forEach((id, index) => {
        positions.set(id, { x: depth * 390, y: componentOffset + index * 260 });
      });
      componentHeight = Math.max(componentHeight, ids.length * 260);
    }
    componentOffset += componentHeight + 100;
  }
  return positions;
}

function createNodes(
  snapshot: ProjectSchemaSnapshot,
  grouped: boolean,
): SchemaNode[] {
  const positions = layoutTables(snapshot.tables, snapshot.relationships, grouped);
  return snapshot.tables.map((table) => ({
    id: `${table.schema}.${table.name}`,
    type: 'schemaTable',
    position: positions.get(`${table.schema}.${table.name}`) ?? { x: 0, y: 0 },
    data: { table, focused: false, dimmed: false },
  }));
}

function createEdges(snapshot: ProjectSchemaSnapshot): DiagramEdge[] {
  const confirmed: DiagramEdge[] = snapshot.relationships.map((relationship) => ({
    id: relationship.id,
    source: `${relationship.fromSchema}.${relationship.fromTable}`,
    target: `${relationship.toSchema}.${relationship.toTable}`,
    type: 'smoothstep',
    label: `${relationship.cardinality === 'one_to_one' ? '1:1' : 'N:1'}${relationship.optional ? ' · optional' : ''}`,
    markerEnd: { type: MarkerType.ArrowClosed },
    style: { stroke: 'var(--primary)', strokeWidth: 1.6 },
    labelStyle: { fill: 'var(--muted-foreground)', fontSize: 10 },
    labelBgStyle: { fill: 'var(--card)' },
    data: { relation: relationship },
  }));
  const inferred: DiagramEdge[] = snapshot.suggestions.map((suggestion) => ({
    id: suggestion.id,
    source: `${snapshot.schema}.${suggestion.fromTable}`,
    target: `${snapshot.schema}.${suggestion.toTable}`,
    type: 'smoothstep',
    label: `suggested M:N via ${suggestion.throughTable}`,
    style: { stroke: 'var(--muted-foreground)', strokeDasharray: '5 5', strokeWidth: 1.4 },
    labelStyle: { fill: 'var(--muted-foreground)', fontSize: 10 },
    labelBgStyle: { fill: 'var(--card)' },
    data: { relation: suggestion },
  }));
  return [...confirmed, ...inferred];
}

function relationLabel(relation: SelectedRelation): string {
  return 'constraintName' in relation
    ? `${relation.cardinality === 'one_to_one' ? 'One to one' : 'Many to one'}${relation.optional ? ' · optional' : ''}`
    : 'Suggested many to many';
}

function TableInspector({
  table,
  close,
  orgSlug,
  projectSlug,
}: {
  table: SchemaTable;
  close: () => void;
  orgSlug: string;
  projectSlug: string;
}) {
  return (
    <aside className="absolute right-3 top-20 z-10 max-h-[calc(100%-6rem)] w-[min(23rem,calc(100%-1.5rem))] overflow-y-auto rounded-2xl border border-border bg-card shadow-xl">
      <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b bg-card/95 p-4 backdrop-blur">
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">{table.schema}</p>
          <h2 className="truncate text-base font-semibold">{table.name}</h2>
        </div>
        <Button variant="ghost" size="icon-sm" aria-label="Close table details" onClick={close}><X /></Button>
      </div>
      <div className="space-y-5 p-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-muted/70 p-3">
            <p className="text-[11px] text-muted-foreground">Estimated rows</p>
            <p className="mt-1 text-sm font-semibold">{table.estimatedRows === null ? 'Unavailable' : `~${table.estimatedRows.toLocaleString()}`}</p>
          </div>
          <div className="rounded-xl bg-muted/70 p-3">
            <p className="text-[11px] text-muted-foreground">Total size</p>
            <p className="mt-1 text-sm font-semibold">{table.sizeBytes === null ? 'Unavailable' : formatBytes(table.sizeBytes)}</p>
          </div>
        </div>
        <section>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Columns</h3>
          <div className="overflow-hidden rounded-xl border">
            {table.columns.map((column) => (
              <div key={column.name} className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 border-b px-3 py-2 last:border-b-0">
                <div className="min-w-0">
                  <p className="truncate font-mono text-xs">{column.name}</p>
                  <p className="mt-0.5 truncate font-mono text-[10px] text-muted-foreground">{column.dataType}{column.nullable ? ' · nullable' : ''}</p>
                </div>
                <div className="flex items-center gap-1 text-amber-500">
                  {column.primaryKey && <KeyRound size={12} aria-label="Primary key" />}
                  {column.unique && !column.primaryKey && <span className="text-[10px] font-bold" title="Unique">U</span>}
                </div>
              </div>
            ))}
          </div>
        </section>
        <section>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Constraints & indexes</h3>
          <div className="space-y-2">
            {[...table.constraints.map((constraint) => ({ name: constraint.name, type: constraint.type, definition: constraint.definition })), ...table.indexes.map((index) => ({ name: index.name, type: `${index.method} index${index.unique ? ' · unique' : ''}`, definition: index.definition }))].length ? (
              [...table.constraints.map((constraint) => ({ name: constraint.name, type: constraint.type, definition: constraint.definition })), ...table.indexes.map((index) => ({ name: index.name, type: `${index.method} index${index.unique ? ' · unique' : ''}`, definition: index.definition }))].map((item) => (
                <div key={`${item.type}:${item.name}`} className="rounded-lg border px-3 py-2">
                  <p className="text-[11px] font-medium">{item.name}<span className="ml-2 font-normal text-muted-foreground">{item.type}</span></p>
                  <p className="mt-1 break-words font-mono text-[10px] text-muted-foreground">{item.definition}</p>
                </div>
              ))
            ) : <p className="text-xs text-muted-foreground">No constraints or indexes discovered.</p>}
          </div>
        </section>
        <div className="flex gap-2">
          <Button asChild size="sm" variant="outline" className="flex-1">
            <Link href={`/organizations/${orgSlug}/${projectSlug}/sql`}>Open SQL Explorer</Link>
          </Button>
          <Button asChild size="icon-sm" variant="outline" aria-label="Open performance">
            <Link href={`/organizations/${orgSlug}/${projectSlug}/performance`}><GitBranch /></Link>
          </Button>
        </div>
      </div>
    </aside>
  );
}

function RelationInspector({ relation, close }: { relation: SelectedRelation; close: () => void }) {
  const confirmed = 'constraintName' in relation;
  return (
    <aside className="absolute right-3 top-20 z-10 w-[min(23rem,calc(100%-1.5rem))] rounded-2xl border border-border bg-card shadow-xl">
      <div className="flex items-center justify-between border-b p-4">
        <div><p className="text-xs text-muted-foreground">Relationship</p><h2 className="text-sm font-semibold">{relationLabel(relation)}</h2></div>
        <Button variant="ghost" size="icon-sm" aria-label="Close relationship details" onClick={close}><X /></Button>
      </div>
      <div className="space-y-3 p-4 text-xs">
        {confirmed ? (
          <>
            <p><span className="text-muted-foreground">Constraint</span><br /><code>{relation.constraintName}</code></p>
            <p><span className="text-muted-foreground">From</span><br /><code>{relation.fromTable} ({relation.fromColumns.join(', ')})</code></p>
            <p><span className="text-muted-foreground">To</span><br /><code>{relation.toTable} ({relation.toColumns.join(', ')})</code></p>
          </>
        ) : (
          <>
            <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-2 text-amber-700 dark:text-amber-300">Suggestion inferred from a junction table. No direct database constraint connects these tables.</p>
            <p><code>{relation.fromTable}</code> ↔ <code>{relation.toTable}</code></p>
            <p><span className="text-muted-foreground">Junction table</span><br /><code>{relation.throughTable}</code></p>
          </>
        )}
        <div className="flex items-center gap-2 rounded-lg bg-muted/70 p-2 text-muted-foreground"><ArrowLeftRight size={14} /> Read-only schema metadata</div>
      </div>
    </aside>
  );
}

function formatBytes(value: number): string {
  if (value < 1024) return `${value} B`;
  if (value < 1024 ** 2) return `${(value / 1024).toFixed(1)} KB`;
  if (value < 1024 ** 3) return `${(value / 1024 ** 2).toFixed(1)} MB`;
  return `${(value / 1024 ** 3).toFixed(2)} GB`;
}

export function SchemaDiagramClient({
  orgSlug,
  projectSlug,
  initialSnapshot,
}: {
  orgSlug: string;
  projectSlug: string;
  initialSnapshot: ProjectSchemaSnapshot | null;
}) {
  const emptySnapshot: ProjectSchemaSnapshot = {
    schema: '', capturedAt: '', schemaHash: '', tables: [], relationships: [], suggestions: [],
  };
  const [snapshot, setSnapshot] = useState(initialSnapshot ?? emptySnapshot);
  const schemaHashRef = useRef(initialSnapshot?.schemaHash);
  const [hasLoaded, setHasLoaded] = useState(Boolean(initialSnapshot));
  const [nodes, setNodes] = useState<SchemaNode[]>(() => createNodes(initialSnapshot ?? emptySnapshot, false));
  const [search, setSearch] = useState('');
  const [schemaFilter, setSchemaFilter] = useState('all');
  const [grouped, setGrouped] = useState(false);
  const [isolate, setIsolate] = useState(false);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [selectedRelation, setSelectedRelation] = useState<SelectedRelation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(!initialSnapshot);
  const [refreshing, setRefreshing] = useState(false);
  const [schemaChanged, setSchemaChanged] = useState(false);

  const refresh = useCallback(async (initial = false) => {
    if (initial) setLoading(true);
    else setRefreshing(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api';
      const response = await fetch(
        `${apiUrl}/orgs/${encodeURIComponent(orgSlug)}/projects/${encodeURIComponent(projectSlug)}/schema`,
        { credentials: 'include', cache: 'no-store' },
      );
      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || `Schema request failed (${response.status})`);
      }
      const nextSnapshot = (await response.json()) as ProjectSchemaSnapshot;
      setSchemaChanged(Boolean(schemaHashRef.current && nextSnapshot.schemaHash !== schemaHashRef.current));
      schemaHashRef.current = nextSnapshot.schemaHash;
      setSnapshot(nextSnapshot);
      setHasLoaded(true);
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to load schema metadata.');
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  }, [orgSlug, projectSlug]);

  // Initial schema loading is an external request; updates happen when the request resolves.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!initialSnapshot) void refresh(true);
  }, [initialSnapshot, refresh]);

  useEffect(() => {
    const timer = window.setInterval(() => void refresh(), 60_000);
    return () => window.clearInterval(timer);
  }, [refresh]);

  // Keep React Flow's controlled node state in sync when the server snapshot changes.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNodes(createNodes(snapshot, grouped));
  }, [snapshot, grouped]);

  const schemas = useMemo(
    () => [...new Set(snapshot.tables.map((table) => table.schema))].sort(),
    [snapshot.tables],
  );
  const visibleTableIds = useMemo(() => {
    const matched = new Set(
      snapshot.tables
        .filter((table) => schemaFilter === 'all' || table.schema === schemaFilter)
        .filter((table) => {
          const query = search.trim().toLowerCase();
          return !query || table.name.toLowerCase().includes(query) || table.columns.some((column) => column.name.toLowerCase().includes(query));
        })
        .map((table) => `${table.schema}.${table.name}`),
    );

    if (!isolate || !selectedTable) return matched;
    const connected = new Set([selectedTable]);
    let changed = true;
    while (changed) {
      changed = false;
      for (const relation of snapshot.relationships) {
        const from = `${relation.fromSchema}.${relation.fromTable}`;
        const to = `${relation.toSchema}.${relation.toTable}`;
        if (connected.has(from) && !connected.has(to)) { connected.add(to); changed = true; }
        if (connected.has(to) && !connected.has(from)) { connected.add(from); changed = true; }
      }
    }
    return new Set([...matched].filter((id) => connected.has(id)));
  }, [isolate, search, schemaFilter, selectedTable, snapshot]);

  const connectedIds = useMemo(() => {
    const result = new Set<string>();
    if (!selectedTable) return result;
    for (const relation of snapshot.relationships) {
      const from = `${relation.fromSchema}.${relation.fromTable}`;
      const to = `${relation.toSchema}.${relation.toTable}`;
      if (from === selectedTable) result.add(to);
      if (to === selectedTable) result.add(from);
    }
    return result;
  }, [selectedTable, snapshot.relationships]);

  const visibleNodes = useMemo(
    () => nodes
      .filter((node) => visibleTableIds.has(node.id))
      .map((node) => ({
        ...node,
        data: {
          ...node.data,
          focused: node.id === selectedTable,
          dimmed: Boolean(selectedTable && node.id !== selectedTable && connectedIds.size && !connectedIds.has(node.id)),
        },
      })),
    [connectedIds, nodes, selectedTable, visibleTableIds],
  );
  const edges = useMemo(() => {
    const visible = new Set(visibleNodes.map((node) => node.id));
    return createEdges(snapshot)
      .filter((edge) => visible.has(edge.source) && visible.has(edge.target))
      .map((edge) => ({
        ...edge,
        selected: selectedRelation?.id === edge.id,
        style: {
          ...edge.style,
          opacity: selectedTable && edge.source !== selectedTable && edge.target !== selectedTable ? 0.15 : 1,
        },
      }));
  }, [selectedRelation, selectedTable, snapshot, visibleNodes]);

  const onNodesChange = useCallback((changes: NodeChange<SchemaNode>[]) => {
    setNodes((current) => applyNodeChanges(changes, current) as SchemaNode[]);
  }, []);

  const selectedTableInfo = selectedTable
    ? snapshot.tables.find((table) => `${table.schema}.${table.name}` === selectedTable) ?? null
    : null;

  const exportSnapshot = () => {
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json' }));
    link.download = `${projectSlug}-schema.json`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  return (
    <section className="flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-border bg-background">
      <header className="flex flex-col gap-3 border-b bg-card px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><GitBranch size={17} /></div>
          <div className="min-w-0">
            <h1 className="truncate text-sm font-semibold">Database Explorer</h1>
            <p className="truncate text-xs text-muted-foreground">{snapshot.schema || 'Discovering schema'} · {snapshot.tables.length} tables · read only</p>
          </div>
          {schemaChanged && <span role="status" className="hidden rounded-full bg-amber-500/10 px-2 py-1 text-[10px] text-amber-600 sm:inline-flex">Schema changed</span>}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="relative min-w-36 flex-1 sm:flex-none">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Find table or column" aria-label="Find table or column" className="h-8 w-full pl-8 text-xs sm:w-48" />
          </label>
          <select value={schemaFilter} onChange={(event) => setSchemaFilter(event.target.value)} aria-label="Filter schema" className="h-8 rounded-lg border border-input bg-background px-2 text-xs">
            <option value="all">All schemas</option>
            {schemas.map((schema) => <option key={schema} value={schema}>{schema}</option>)}
          </select>
          <label className="flex h-8 items-center gap-1.5 rounded-lg border px-2 text-xs text-muted-foreground">
            <input type="checkbox" checked={grouped} onChange={(event) => setGrouped(event.target.checked)} />Group by schema
          </label>
          <label className="flex h-8 items-center gap-1.5 rounded-lg border px-2 text-xs text-muted-foreground">
            <input type="checkbox" checked={isolate} onChange={(event) => setIsolate(event.target.checked)} disabled={!selectedTable} />Isolate
          </label>
          <Button variant="outline" size="sm" onClick={() => void refresh()} disabled={refreshing} aria-label="Refresh schema">
            {refreshing ? <LoaderCircle className="animate-spin" /> : <RefreshCw />}<span className="hidden sm:inline">Refresh</span>
          </Button>
          <Button variant="outline" size="icon-sm" onClick={exportSnapshot} aria-label="Export schema as JSON" title="Export schema JSON"><ArrowDownToLine /></Button>
        </div>
      </header>
      {error && (
        <div role="alert" className="flex items-start gap-2 border-b border-destructive/20 bg-destructive/5 px-4 py-2 text-xs text-destructive">
          <AlertCircle size={14} className="mt-0.5 shrink-0" /><span className="min-w-0 break-words">{error}</span>
          <Button variant="ghost" size="sm" className="ml-auto h-6" onClick={() => void refresh()}>Retry</Button>
        </div>
      )}
      <div className="relative min-h-0 flex-1 bg-muted/30">
        {loading ? (
          <div role="status" className="absolute inset-0 flex items-center justify-center gap-2 text-sm text-muted-foreground"><LoaderCircle className="animate-spin" size={16} />Loading schema metadata…</div>
        ) : error && !hasLoaded ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
            <AlertCircle className="mb-3 text-destructive" size={22} />
            <p className="text-sm font-medium">Could not load the schema</p>
            <p className="mt-1 max-w-sm break-words text-xs text-muted-foreground">{error}</p>
            <Button variant="outline" size="sm" className="mt-4" onClick={() => void refresh(true)}>Try again</Button>
          </div>
        ) : visibleNodes.length === 0 ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
            <div className="mb-3 flex size-11 items-center justify-center rounded-xl bg-muted text-muted-foreground"><Database size={19} /></div>
            <p className="text-sm font-medium">{snapshot.tables.length ? 'No tables match this search' : 'No tables in this project yet'}</p>
            <p className="mt-1 max-w-sm text-xs text-muted-foreground">
              {snapshot.tables.length ? 'Try another table or column name.' : 'Create a table in Database to see its schema here.'}
            </p>
          </div>
        ) : (
          <ReactFlow
            nodes={visibleNodes}
            edges={edges}
            nodeTypes={nodeTypes}
            onNodesChange={onNodesChange}
            onNodeClick={(_, node) => { setSelectedTable(node.id); setSelectedRelation(null); }}
            onEdgeClick={(_, edge) => { setSelectedRelation(edge.data?.relation ?? null); setSelectedTable(null); }}
            onPaneClick={() => { setSelectedTable(null); setSelectedRelation(null); }}
            fitView
            fitViewOptions={{ padding: 0.2 }}
            minZoom={0.12}
            maxZoom={1.5}
            defaultEdgeOptions={{ markerEnd: { type: MarkerType.ArrowClosed } }}
          >
            <Background color="var(--border)" gap={22} size={1} />
            <Controls position="bottom-left" showInteractive={false} />
            <MiniMap position="bottom-right" pannable zoomable nodeColor="var(--primary)" maskColor="var(--background)" />
          </ReactFlow>
        )}
        {selectedTableInfo && <TableInspector table={selectedTableInfo} close={() => setSelectedTable(null)} orgSlug={orgSlug} projectSlug={projectSlug} />}
        {selectedRelation && <RelationInspector relation={selectedRelation} close={() => setSelectedRelation(null)} />}
      </div>
      <footer className="flex flex-wrap items-center justify-between gap-2 border-t bg-card px-4 py-2 text-[10px] text-muted-foreground">
        <span>PK = primary key · U = unique · N:1 = many-to-one · dotted edge = inferred suggestion</span>
        <span aria-live="polite">{snapshot.capturedAt ? `Updated ${new Date(snapshot.capturedAt).toLocaleTimeString()}` : 'Waiting for schema metadata'}</span>
      </footer>
    </section>
  );
}
