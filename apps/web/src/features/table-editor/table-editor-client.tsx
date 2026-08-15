"use client";

import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  type ColumnDef,
} from "@tanstack/react-table";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Search,
  Plus,
  MoreVertical,
  Expand,
  Table2,
  X,
  ChevronLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { TableInfo } from "@qube/types";
import { tableEditorAction } from "@/features/table-editor/action";
import { TABLE_EDITOR_INTENT } from "@qube/constants";
import { CreateTableDrawer } from "./create-table-drawer";
import { AddColumnDialog } from "./add-column-dialog";

interface TableEditorClientProps {
  orgSlug: string;
  projectSlug: string;
  dbSchema: string;
  initialTables: string[];
}

interface OpenTab {
  tableName: string;
  info: TableInfo | null;
  rows: Record<string, unknown>[];
  count: number;
  loading: boolean;
}

export function TableEditorClient({
  orgSlug,
  projectSlug,
  dbSchema,
  initialTables,
}: TableEditorClientProps) {
  const projectKey = `${orgSlug}/${projectSlug}`;
  const [tables, setTables] = useState<string[]>(initialTables);
  const lastProjectKeyRef = useRef(projectKey);

  useEffect(() => {
    if (lastProjectKeyRef.current !== projectKey) {
      lastProjectKeyRef.current = projectKey;
      setTables(initialTables);
    }
  }, [projectKey, initialTables]);

  const [search, setSearch] = useState("");
  const [activeTable, setActiveTable] = useState<string | null>(null);
  const [openTabs, setOpenTabs] = useState<OpenTab[]>([]);
  const [activeTab, setActiveTab] = useState<string | null>(null);
  const [expandedRow, setExpandedRow] = useState<Record<
    string,
    unknown
  > | null>(null);
  const [createDrawerOpen, setCreateDrawerOpen] = useState(false);

  const tableFetchGenRef = useRef<Map<string, number>>(new Map());

  const beginTableFetch = (tableName: string) => {
    const gen = (tableFetchGenRef.current.get(tableName) ?? 0) + 1;
    tableFetchGenRef.current.set(tableName, gen);
    return gen;
  };

  const isTableFetchStale = (tableName: string, gen: number) =>
    (tableFetchGenRef.current.get(tableName) ?? 0) !== gen;

  const actionCtx = { orgSlug, projectSlug };

  const openTable = useCallback(
    async (tableName: string) => {
      setActiveTable(tableName);
      setActiveTab(tableName);

      let alreadyOpen = false;
      setOpenTabs((prev) => {
        alreadyOpen = prev.some((t) => t.tableName === tableName);
        if (alreadyOpen) return prev;
        return [
          ...prev,
          { tableName, info: null, rows: [], count: 0, loading: true },
        ];
      });

      if (alreadyOpen) return;

      const fetchGen = beginTableFetch(tableName);

      const formData = new FormData();
      formData.set("intent", TABLE_EDITOR_INTENT.FETCH_TABLE);
      formData.set("tableName", tableName);

      const result = await tableEditorAction(actionCtx, {}, formData);

      if (isTableFetchStale(tableName, fetchGen)) return;

      if (result.error || !result.tableData) {
        setOpenTabs((prev) => prev.filter((t) => t.tableName !== tableName));
        return;
      }

      const { info, rows, count } = result.tableData;
      setOpenTabs((prev) =>
        prev.map((t) =>
          t.tableName === tableName
            ? { ...t, info, rows, count, loading: false }
            : t,
        ),
      );
    },
    [orgSlug, projectSlug],
  );

  const refreshTable = useCallback(
    async (tableName: string) => {
      const fetchGen = beginTableFetch(tableName);

      setOpenTabs((prev) =>
        prev.map((t) =>
          t.tableName === tableName ? { ...t, loading: true } : t,
        ),
      );

      const formData = new FormData();
      formData.set("intent", TABLE_EDITOR_INTENT.FETCH_TABLE);
      formData.set("tableName", tableName);

      const result = await tableEditorAction(actionCtx, {}, formData);

      if (isTableFetchStale(tableName, fetchGen)) return;

      if (result.error || !result.tableData) {
        setOpenTabs((prev) =>
          prev.map((t) =>
            t.tableName === tableName ? { ...t, loading: false } : t,
          ),
        );
        return;
      }

      const { info, rows, count } = result.tableData;
      setOpenTabs((prev) =>
        prev.map((t) =>
          t.tableName === tableName
            ? { ...t, info, rows, count, loading: false }
            : t,
        ),
      );
    },
    [orgSlug, projectSlug],
  );

  const closeTab = useCallback((tableName: string) => {
    setOpenTabs((prev) => {
      const remaining = prev.filter((t) => t.tableName !== tableName);
      setActiveTab((tab) =>
        tab === tableName ? (remaining.at(-1)?.tableName ?? null) : tab,
      );
      return remaining;
    });
  }, []);

  const deleteTable = async (tableName: string) => {
    beginTableFetch(tableName);

    setTables((prev) => prev.filter((t) => t !== tableName));
    closeTab(tableName);
    if (activeTable === tableName) setActiveTable(null);

    const formData = new FormData();
    formData.set("intent", TABLE_EDITOR_INTENT.DELETE_TABLE);
    formData.set("tableName", tableName);

    const result = await tableEditorAction(actionCtx, {}, formData);
    if (result.error) {
      setTables((prev) => [...prev, tableName].sort());
      return;
    }
  };

  const onTableCreated = (tableName: string) => {
    setTables((prev) => [...prev, tableName].sort());
    setCreateDrawerOpen(false);
    void openTable(tableName);
  };

  const filteredTables = tables.filter((t) =>
    t.toLowerCase().includes(search.toLowerCase()),
  );

  const currentTab = openTabs.find((t) => t.tableName === activeTab);

  const backToTableList = () => {
    setActiveTab(null);
    setActiveTable(null);
  };

  const listPanel = (
    <TableListPanel
      dbSchema={dbSchema}
      search={search}
      onSearchChange={setSearch}
      filteredTables={filteredTables}
      activeTable={activeTable}
      onOpenTable={openTable}
      onNewTable={() => setCreateDrawerOpen(true)}
      onDeleteTable={deleteTable}
      className="md:border-r md:border-border"
    />
  );

  const mainPanel = (
    <EditorMainPanel
      orgSlug={orgSlug}
      projectSlug={projectSlug}
      openTabs={openTabs}
      activeTab={activeTab}
      currentTab={currentTab}
      onSelectTab={setActiveTab}
      onCloseTab={closeTab}
      onExpandRow={setExpandedRow}
      onRefreshTable={refreshTable}
      showMobileBack={false}
    />
  );

  const mobileMainPanel = (
    <EditorMainPanel
      orgSlug={orgSlug}
      projectSlug={projectSlug}
      openTabs={openTabs}
      activeTab={activeTab}
      currentTab={currentTab}
      onSelectTab={setActiveTab}
      onCloseTab={closeTab}
      onExpandRow={setExpandedRow}
      onRefreshTable={refreshTable}
      showMobileBack
      onMobileBack={backToTableList}
    />
  );

  return (
    <div className="flex h-full min-h-0 w-full flex-1 overflow-hidden">
      {/* Mobile: full-width list OR table view */}
      <div className="flex h-full min-h-0 w-full flex-col md:hidden">
        {activeTab ? mobileMainPanel : listPanel}
      </div>

      {/* Desktop: resizable split pane */}
      <div className="hidden h-full min-h-0 w-full md:flex">
        <ResizablePanelGroup
          orientation="horizontal"
          className="h-full w-full min-h-0"
          defaultLayout={{ "table-list": 20, "table-main": 80 }}
        >
          <ResizablePanel
            id="table-list"
            defaultSize="20"
            minSize="15"
            maxSize="30"
          >
            {listPanel}
          </ResizablePanel>

          <ResizableHandle withHandle />

          <ResizablePanel id="table-main" defaultSize="80" minSize="50">
            {mainPanel}
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>

      <Sheet open={!!expandedRow} onOpenChange={() => setExpandedRow(null)}>
        <SheetContent
          side="right"
          className="flex h-full w-full max-w-full flex-col gap-0 p-0 sm:max-w-md"
        >
          <SheetHeader className="border-b px-4 py-4">
            <SheetTitle>
              View row from <span className="font-mono">{activeTab}</span>
            </SheetTitle>
          </SheetHeader>
          {expandedRow && currentTab?.info && (
            <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
              {currentTab.info.columns.map((col) => (
                <div key={col.name} className="space-y-1">
                  <p className="text-sm font-medium">{col.name}</p>
                  <p className="text-xs text-muted-foreground">{col.type}</p>
                  {col.foreignKey && (
                    <p className="text-xs text-muted-foreground">
                      Foreign key →{" "}
                      <span className="font-mono">
                        {col.foreignKey.table}.{col.foreignKey.column}
                      </span>
                    </p>
                  )}
                  <Input
                    readOnly
                    defaultValue={String(expandedRow[col.name] ?? "")}
                    className="font-mono text-xs bg-muted/40"
                  />
                </div>
              ))}
            </div>
          )}
        </SheetContent>
      </Sheet>

      <CreateTableDrawer
        open={createDrawerOpen}
        onOpenChange={setCreateDrawerOpen}
        orgSlug={orgSlug}
        projectSlug={projectSlug}
        existingTables={tables}
        onCreated={onTableCreated}
      />
    </div>
  );
}

function TableListPanel({
  dbSchema,
  search,
  onSearchChange,
  filteredTables,
  activeTable,
  onOpenTable,
  onNewTable,
  onDeleteTable,
  className,
}: {
  dbSchema: string;
  search: string;
  onSearchChange: (value: string) => void;
  filteredTables: string[];
  activeTable: string | null;
  onOpenTable: (tableName: string) => void;
  onNewTable: () => void;
  onDeleteTable: (tableName: string) => void;
  className?: string;
}) {
  return (
    <div className={cn("flex h-full min-h-0 flex-col", className)}>
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <span className="text-xs text-muted-foreground">
          schema{" "}
          <span className="font-mono font-medium text-foreground">
            {dbSchema}
          </span>
        </span>
      </div>

      <div className="border-b border-border px-3 py-2">
        <Button
          variant="outline"
          size="sm"
          className="w-full justify-start gap-1.5"
          onClick={onNewTable}
        >
          <Plus size={14} />
          New table
        </Button>
      </div>

      <div className="border-b border-border px-3 py-2">
        <div className="relative">
          <Search
            size={12}
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            placeholder="Search tables..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="h-7 pl-7 text-xs"
          />
        </div>
      </div>

      <ScrollArea className="min-h-0 flex-1">
        <div className="py-1">
          {filteredTables.map((table) => (
            <div
              key={table}
              className={cn(
                "flex cursor-pointer items-center justify-between px-3 py-2",
                activeTable === table
                  ? "bg-accent text-accent-foreground"
                  : "hover:bg-accent/50",
              )}
              onClick={() => void onOpenTable(table)}
            >
              <div className="flex min-w-0 items-center gap-2">
                <Table2 size={14} className="shrink-0 text-muted-foreground" />
                <span className="truncate text-sm">{table}</span>
              </div>

              {activeTable === table && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 shrink-0"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <MoreVertical size={12} />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem
                      onSelect={() => void navigator.clipboard.writeText(table)}
                    >
                      Copy name
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onSelect={() =>
                        void navigator.clipboard.writeText(
                          `SELECT * FROM "${table}";`,
                        )
                      }
                    >
                      Copy SELECT query
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-destructive"
                      onSelect={() => void onDeleteTable(table)}
                    >
                      Delete table
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}

function EditorMainPanel({
  orgSlug,
  projectSlug,
  openTabs,
  activeTab,
  currentTab,
  onSelectTab,
  onCloseTab,
  onExpandRow,
  onRefreshTable,
  showMobileBack,
  onMobileBack,
}: {
  orgSlug: string;
  projectSlug: string;
  openTabs: OpenTab[];
  activeTab: string | null;
  currentTab: OpenTab | undefined;
  onSelectTab: (tableName: string) => void;
  onCloseTab: (tableName: string) => void;
  onExpandRow: (row: Record<string, unknown>) => void;
  onRefreshTable: (tableName: string) => void;
  showMobileBack: boolean;
  onMobileBack?: () => void;
}) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      {showMobileBack && activeTab && (
        <div className="flex shrink-0 items-center gap-2 border-b border-border px-2 py-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={onMobileBack}
          >
            <ChevronLeft size={18} />
          </Button>
          <Table2 size={14} className="shrink-0 text-muted-foreground" />
          <span className="truncate text-sm font-medium">{activeTab}</span>
        </div>
      )}

      <div
        className={cn(
          "flex shrink-0 items-center overflow-x-auto border-b border-border bg-background",
          showMobileBack && openTabs.length <= 1 && "hidden",
        )}
      >
        {openTabs.map((tab) => (
          <div
            key={tab.tableName}
            className={cn(
              "flex h-9 shrink-0 cursor-pointer items-center gap-1.5 border-r border-border px-3 text-sm",
              activeTab === tab.tableName
                ? "bg-background text-foreground"
                : "bg-muted/40 text-muted-foreground hover:bg-muted",
            )}
            onClick={() => onSelectTab(tab.tableName)}
          >
            <Table2 size={12} />
            <span className="max-w-32 truncate sm:max-w-none">
              {tab.tableName}
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onCloseTab(tab.tableName);
              }}
              className="ml-1 hover:text-foreground"
            >
              <X size={10} />
            </button>
          </div>
        ))}
      </div>

      {!currentTab ? (
        <div className="flex flex-1 flex-col items-center justify-center text-center px-4">
          <Table2 size={32} className="mb-3 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            {showMobileBack
              ? "No table selected"
              : "Select a table from the left panel"}
          </p>
        </div>
      ) : currentTab.loading ? (
        <div className="flex flex-1 items-center justify-center">
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      ) : !currentTab.info ? (
        <div className="flex flex-1 items-center justify-center">
          <p className="text-sm text-muted-foreground">Failed to load table</p>
        </div>
      ) : (
        <DataGrid
          orgSlug={orgSlug}
          projectSlug={projectSlug}
          tableName={currentTab.tableName}
          tableInfo={currentTab.info}
          rows={currentTab.rows}
          count={currentTab.count}
          onExpandRow={onExpandRow}
          onColumnAdded={() => void onRefreshTable(currentTab.tableName)}
        />
      )}
    </div>
  );
}

function DataGrid({
  orgSlug,
  projectSlug,
  tableName,
  tableInfo,
  rows,
  count,
  onExpandRow,
  onColumnAdded,
}: {
  orgSlug: string;
  projectSlug: string;
  tableName: string;
  tableInfo: TableInfo;
  rows: Record<string, unknown>[];
  count: number;
  onExpandRow: (row: Record<string, unknown>) => void;
  onColumnAdded: () => void;
}) {
  const columns = useMemo<ColumnDef<Record<string, unknown>>[]>(
    () => [
      {
        id: "expand",
        size: 40,
        cell: ({ row }) => (
          <button
            type="button"
            onClick={() => onExpandRow(row.original)}
            className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-accent rounded"
          >
            <Expand size={12} />
          </button>
        ),
      },
      ...tableInfo.columns.map(
        (col): ColumnDef<Record<string, unknown>> => ({
          id: col.name,
          header: () => (
            <div className="flex items-center gap-1.5">
              {col.isPrimaryKey && <span className="text-yellow-500">🔑</span>}
              {col.foreignKey && <span className="text-blue-500">🔗</span>}
              <span className="font-medium">{col.name}</span>
              <span className="text-muted-foreground font-normal">
                {col.type}
              </span>
            </div>
          ),
          accessorFn: (row) => row[col.name],
          cell: ({ getValue }) => {
            const val = getValue();
            if (val === null || val === undefined) {
              return (
                <span className="text-muted-foreground italic text-xs">
                  NULL
                </span>
              );
            }
            if (typeof val === "object") {
              return (
                <span className="font-mono text-xs">{JSON.stringify(val)}</span>
              );
            }
            return <span className="text-sm">{String(val)}</span>;
          },
        }),
      ),
      {
        id: "add-column",
        size: 48,
        header: () => (
          <AddColumnDialog
            orgSlug={orgSlug}
            projectSlug={projectSlug}
            tableName={tableName}
            onAdded={onColumnAdded}
            className="mx-auto"
          />
        ),
        cell: () => null,
      },
    ],
    [tableInfo, onExpandRow, orgSlug, projectSlug, tableName, onColumnAdded],
  );

  const table = useReactTable({
    data: rows,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <ScrollArea className="flex-1">
        <Table>
          <TableHeader className="sticky top-0 bg-background z-10">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className={cn(
                      "border-r border-border text-xs",
                      header.column.id === "add-column" &&
                        "sticky right-0 z-20 w-12 min-w-12 border-l border-border bg-background p-0 text-center",
                    )}
                  >
                    {flexRender(
                      header.column.columnDef.header,
                      header.getContext(),
                    )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.map((row) => (
              <TableRow key={row.id} className="group">
                {row.getVisibleCells().map((cell) => (
                  <TableCell
                    key={cell.id}
                    className={cn(
                      "border-r border-border py-1.5",
                      cell.column.id === "add-column" &&
                        "sticky right-0 z-10 w-12 min-w-12 border-l border-border bg-background p-0",
                    )}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </ScrollArea>

      <div className="flex items-center justify-between px-4 py-2 border-t border-border text-xs text-muted-foreground shrink-0">
        <span>
          {count} {count === 1 ? "record" : "records"}
        </span>
        <span>100 rows</span>
      </div>
    </div>
  );
}
