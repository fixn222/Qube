"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import axios from "axios";
import { RefreshCw } from "lucide-react";
import type { ObservatoryRange, ObservatorySnapshot } from "@qube/types";
import apiClient, { getApiBaseUrl } from "@/lib/axios";
import { Button } from "@/components/ui/button";

const ranges: ObservatoryRange[] = ["1h", "24h", "7d", "30d"];

export type ObservatoryView =
  | "project"
  | "overview"
  | "events"
  | "api"
  | "performance"
  | "errors"
  | "realtime";

const viewCopy: Record<ObservatoryView, { title: string; description: string }> = {
  project: {
    title: "Project overview",
    description: "Project status, database summary, and shortcuts to common workflows.",
  },
  overview: {
    title: "Analytics overview",
    description: "Project traffic, failures, latency, and recent activity.",
  },
  events: {
    title: "Events & activity",
    description: "Recent instrumented requests, SQL operations, and realtime events.",
  },
  api: {
    title: "API usage & traffic",
    description: "Qube REST request volume, outcomes, and response latency.",
  },
  performance: {
    title: "Performance & latency",
    description: "Request and SQL latency percentiles with the slowest query fingerprints.",
  },
  errors: {
    title: "Errors & failures",
    description: "Failed API and SQL operations recorded during this time range.",
  },
  realtime: {
    title: "Realtime activity",
    description: "Observed connection, subscription, and event delivery activity.",
  },
};

function telemetryErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const status = error.response?.status;
    if (status === 401)
      return "Your session expired. Sign in again to view project analytics.";
    if (status === 403)
      return "Your account does not have access to this project’s analytics.";
    if (status === 404)
      return "The analytics endpoint or project was not found. Restart the API and verify this project belongs to the selected organization.";
    if (status)
      return `The analytics API returned HTTP ${status}. Check the API logs, then retry.`;
    return `Could not reach the Qube API at ${getApiBaseUrl()}. Check that the API is running and that NEXT_PUBLIC_API_URL points to it.`;
  }
  return "Could not load project telemetry. Retry the request.";
}

function formatTimestamp(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Unknown time"
    : `${date.toISOString().replace("T", " ").slice(0, 19)} UTC`;
}

function MetricCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <section className="rounded-xl border bg-card p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-semibold tabular-nums">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
    </section>
  );
}

function Sparkline({ points, label }: { points: number[]; label: string }) {
  if (!points.length || points.every((point) => point === 0)) {
    return (
      <div className="flex h-40 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
        No {label.toLowerCase()} telemetry in this range
      </div>
    );
  }
  const max = Math.max(...points, 1);
  const coords = points
    .map(
      (point, i) =>
        `${(i / Math.max(1, points.length - 1)) * 100},${100 - (point / max) * 88}`,
    )
    .join(" ");
  return (
    <div className="rounded-lg border bg-background/50 p-3">
      <div className="mb-2 flex justify-between text-xs text-muted-foreground">
        <span>{label}</span>
        <span>Bucket totals</span>
      </div>
      <svg
        viewBox="0 0 100 100"
        className="h-32 w-full"
        preserveAspectRatio="none"
        role="img"
        aria-label={`${label} activity chart`}
      >
        <polyline
          points={coords}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          vectorEffect="non-scaling-stroke"
          className="text-primary"
        />
      </svg>
    </div>
  );
}

function EventTable({
  events,
  emptyMessage,
}: {
  events: ObservatorySnapshot["recentEvents"];
  emptyMessage: string;
}) {
  if (!events.length) {
    return (
      <div className="py-12 text-center text-sm text-muted-foreground">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[620px] text-left text-sm">
        <thead className="text-xs text-muted-foreground">
          <tr className="border-b">
            <th className="py-2 pr-4 font-medium">Event</th>
            <th className="py-2 pr-4 font-medium">Resource</th>
            <th className="py-2 pr-4 font-medium">Outcome</th>
            <th className="py-2 pr-4 font-medium">Duration</th>
            <th className="py-2 font-medium">Time</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {events.map((event) => (
            <tr key={event.id}>
              <td className="py-3 pr-4 font-medium">
                {event.eventType}
                {event.operation ? ` · ${event.operation}` : ""}
              </td>
              <td className="max-w-48 truncate py-3 pr-4 font-mono text-xs text-muted-foreground">
                {event.resource ?? "—"}
              </td>
              <td className="py-3 pr-4">
                {event.success === false || (event.statusCode ?? 0) >= 400 ? (
                  <span className="text-destructive">
                    Failed{event.statusCode ? ` · ${event.statusCode}` : ""}
                  </span>
                ) : event.success === true ? (
                  <span className="text-emerald-600 dark:text-emerald-400">
                    Success{event.statusCode ? ` · ${event.statusCode}` : ""}
                  </span>
                ) : (
                  <span className="text-muted-foreground">Unclassified</span>
                )}
              </td>
              <td className="py-3 pr-4 tabular-nums">
                {event.durationMs === null ? "—" : `${event.durationMs} ms`}
              </td>
              <td className="py-3 text-xs text-muted-foreground">
                {formatTimestamp(event.occurredAt)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function MetricsGrid({
  items,
}: {
  items: Array<{ label: string; value: string; detail: string }>;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => <MetricCard key={item.label} {...item} />)}
    </div>
  );
}

export function ObservatoryClient({
  orgSlug,
  projectSlug,
  initialSnapshot,
  initialRange = "24h",
  view = "overview",
  heading,
}: {
  orgSlug: string;
  projectSlug: string;
  initialSnapshot: ObservatorySnapshot | null;
  initialRange?: ObservatoryRange;
  view?: ObservatoryView;
  heading?: string;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [snapshot, setSnapshot] = useState(initialSnapshot);
  const [range, setRange] = useState<ObservatoryRange>(initialRange);
  const [loading, setLoading] = useState(!initialSnapshot);
  const [error, setError] = useState<string | null>(null);
  const [streamConnected, setStreamConnected] = useState(false);
  const [streamError, setStreamError] = useState(false);
  const lastRange = useRef(range);
  const requestController = useRef<AbortController | null>(null);
  const load = useCallback(
    async (selectedRange = range) => {
      requestController.current?.abort();
      const controller = new AbortController();
      requestController.current = controller;
      setLoading(true);
      try {
        const { data } = await apiClient.get<ObservatorySnapshot>(
          `/orgs/${orgSlug}/projects/${projectSlug}/observatory`,
          { params: { range: selectedRange }, signal: controller.signal },
        );
        setSnapshot(data);
        setError(null);
      } catch (requestError) {
        if (!controller.signal.aborted) setError(telemetryErrorMessage(requestError));
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    },
    [orgSlug, projectSlug, range],
  );
  const changeRange = (nextRange: ObservatoryRange) => {
    setRange(nextRange);
    const params = new URLSearchParams(searchParams.toString());
    params.set("range", nextRange);
    window.history.pushState(null, "", `${pathname}?${params.toString()}`);
  };
  // The effect starts an external request/stream; state changes happen in its callbacks.
  useEffect(() => {
    if (!initialSnapshot || lastRange.current !== range) {
      // The server already loaded the initial 24-hour snapshot. Fetch again
      // only when no snapshot was available or the selected range changes.
      void load(range);
    }
    lastRange.current = range;
    if (typeof EventSource === "undefined") {
      const timer = window.setInterval(() => void load(range), 15_000);
      return () => window.clearInterval(timer);
    }
    const stream = new EventSource(
      `${getApiBaseUrl()}/orgs/${orgSlug}/projects/${projectSlug}/observatory/stream?range=${range}`,
      { withCredentials: true },
    );
    stream.onopen = () => setStreamConnected(true);
    stream.addEventListener("snapshot", (event) => {
      try {
        const message = JSON.parse((event as MessageEvent<string>).data) as {
          data?: ObservatorySnapshot;
        };
        if (message.data) {
          setSnapshot(message.data);
          setStreamError(false);
        }
      } catch {
        setStreamConnected(false);
      }
    });
    stream.addEventListener("telemetry-error", () => setStreamError(true));
    stream.onerror = () => setStreamConnected(false);
    return () => stream.close();
  }, [initialSnapshot, load, range, orgSlug, projectSlug]);

  useEffect(() => {
    const syncRange = () => {
      const urlRange = new URLSearchParams(window.location.search).get("range");
      if (ranges.includes(urlRange as ObservatoryRange)) {
        setRange(urlRange as ObservatoryRange);
      }
    };
    window.addEventListener("popstate", syncRange);
    return () => window.removeEventListener("popstate", syncRange);
  }, []);

  const apiSeries = snapshot?.api.series ?? [];
  const sqlSeries = snapshot?.sql.series ?? [];
  const copy = viewCopy[view];
  const pageTitle = heading ?? copy.title;
  const activeEvents = snapshot?.recentEvents ?? [];
  const apiEvents = activeEvents.filter((event) => event.eventType === "api.request");
  const failedEvents = activeEvents.filter(
    (event) => event.success === false || (event.statusCode ?? 0) >= 400,
  );
  const totalErrors = snapshot?.totalErrors ?? 0;
  const eventsForView = view === "api"
    ? apiEvents
    : view === "realtime"
      ? activeEvents.filter((event) => event.eventType.startsWith("realtime."))
      : view === "errors"
        ? failedEvents
        : activeEvents;
  const analyticsHref = (segment: string) =>
    `/organizations/${orgSlug}/${projectSlug}/analytics${segment ? `/${segment}` : ""}?range=${range}`;
  return (
    <main className="mx-auto w-full max-w-7xl space-y-6 p-5 sm:p-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Project</span>
            <span>/</span>
            <span>{projectSlug}</span>
          </div>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">
            {pageTitle}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {snapshot?.project.name ?? projectSlug} · schema{" "}
            <code>{snapshot?.project.schema ?? "—"}</code> ·{" "}
            {snapshot?.health.status === "unknown"
              ? "Telemetry not available yet"
              : (snapshot?.health.status ?? "Loading status")}
          </p>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            {copy.description}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border p-1" aria-label="Time range">
            {ranges.map((item) => (
              <button
                key={item}
                onClick={() => changeRange(item)}
                className={`rounded-md px-2.5 py-1.5 text-xs ${range === item ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
                aria-pressed={range === item}
              >
                {item}
              </button>
            ))}
          </div>
          <Button
            variant="outline"
            size="icon"
            aria-label="Refresh metrics"
            onClick={() => void load()}
          >
            <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </header>
      {error && (
        <div
          className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm"
          role="alert"
        >
          {error}
          <Button variant="link" onClick={() => void load()}>
            Retry
          </Button>
        </div>
      )}
      {snapshot && (
        <p className="-mt-4 text-xs text-muted-foreground" role="status">
          {streamError
            ? "Live analytics refresh failed; the last successful snapshot is shown."
            : streamConnected
              ? "Live updates connected"
              : "Live updates reconnecting; manual refresh is available."}
        </p>
      )}
      {snapshot?.telemetryStatus === "migration_required" && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 text-sm">
          <p className="font-medium">Telemetry migration required</p>
          <p className="mt-1 text-muted-foreground">
            Run <code>pnpm --filter api db:migrate</code> from the repository
            root, then refresh this page. Project schema information remains
            available.
          </p>
        </div>
      )}
      {!snapshot && loading && (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <div
              key={i}
              className="h-28 animate-pulse rounded-xl border bg-muted/40"
            />
          ))}
        </div>
      )}
      {snapshot && (
        <>
          {view === "project" && <>
            <MetricsGrid items={[{ label: "Health", value: snapshot.health.status === "unknown" ? "Unavailable" : snapshot.health.status, detail: snapshot.health.detail }, { label: "Database tables", value: snapshot.database.tableCount.toLocaleString(), detail: `Schema ${snapshot.project.schema}` }, { label: "Recorded events", value: snapshot.totalEvents.toLocaleString(), detail: `Last ${range}` }, { label: "API requests", value: snapshot.api.requests.toLocaleString(), detail: "Instrumented Qube API traffic" }]} />
            <section className="rounded-xl border bg-card p-5"><h2 className="font-medium">Get to work</h2><p className="mt-1 text-sm text-muted-foreground">Explore the schema, run a query, or review current project analytics.</p><div className="mt-4 flex flex-wrap gap-2"><Button asChild variant="outline" size="sm"><Link href={`/organizations/${orgSlug}/${projectSlug}/analytics/data-model`}>Database Explorer</Link></Button><Button asChild variant="outline" size="sm"><Link href={`/organizations/${orgSlug}/${projectSlug}/sql`}>Open SQL editor</Link></Button><Button asChild variant="outline" size="sm"><Link href={analyticsHref("")}>Analytics overview</Link></Button><Button asChild variant="outline" size="sm"><Link href={`/organizations/${orgSlug}/${projectSlug}/database`}>Browse tables</Link></Button></div></section>
            <section className="rounded-xl border bg-card p-4"><h2 className="mb-3 font-medium">Recent project activity</h2><EventTable events={activeEvents.slice(0, 8)} emptyMessage="No project telemetry has been collected in this range." /></section>
          </>}
          {view === "overview" && <>
          <MetricsGrid items={[
            { label: "Events", value: snapshot.totalEvents.toLocaleString(), detail: `Recorded in the last ${range}` },
            { label: "API requests", value: snapshot.api.requests.toLocaleString(), detail: snapshot.api.successRate === null ? "No instrumented requests" : `${snapshot.api.successRate.toFixed(1)}% successful` },
            { label: "Failures", value: totalErrors.toLocaleString(), detail: `${snapshot.api.errors} API · ${snapshot.sql.errors} SQL` },
            { label: "API p95 latency", value: snapshot.api.p95 === null ? "—" : `${snapshot.api.p95} ms`, detail: snapshot.api.p50 === null ? "No latency data" : `p50 ${snapshot.api.p50} ms · p99 ${snapshot.api.p99 ?? "—"} ms` },
          ]} />
          <div className="grid gap-4 lg:grid-cols-2">
            <section className="space-y-3 rounded-xl border bg-card p-4"><h2 className="font-medium">API traffic</h2><Sparkline points={apiSeries.map((p) => p.requests)} label="Requests" /></section>
            <section className="space-y-3 rounded-xl border bg-card p-4"><h2 className="font-medium">Errors</h2><Sparkline points={apiSeries.map((p) => p.errors)} label="API errors" /></section>
          </div>
          <section className="rounded-xl border bg-card p-4">
            <div className="mb-3 flex items-center justify-between"><h2 className="font-medium">Recent activity</h2><Link className="text-sm text-primary hover:underline" href={analyticsHref("events")}>View events</Link></div>
            <EventTable events={activeEvents.slice(0, 8)} emptyMessage="No project telemetry has been collected in this range." />
          </section>
          <section className="flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm"><Link href={analyticsHref("api")}>API traffic</Link></Button>
            <Button asChild variant="outline" size="sm"><Link href={analyticsHref("errors")}>Review failures</Link></Button>
            <Button asChild variant="outline" size="sm"><Link href={`/organizations/${orgSlug}/${projectSlug}/analytics/data-model`}>Explore database schema</Link></Button>
            <Button asChild variant="outline" size="sm"><Link href={`/organizations/${orgSlug}/${projectSlug}/sql`}>Open SQL editor</Link></Button>
          </section>
          </>}
          {view === "events" && <>
            <MetricsGrid items={[{ label: "Recorded events", value: snapshot.totalEvents.toLocaleString(), detail: `Within ${range}` }, { label: "Failures", value: totalErrors.toLocaleString(), detail: "API and SQL operations" }, { label: "API requests", value: snapshot.api.requests.toLocaleString(), detail: "Instrumented Qube REST requests" }, { label: "Realtime deliveries", value: snapshot.realtime.deliveries.toLocaleString(), detail: "Recorded delivery events" }]} />
            <section className="rounded-xl border bg-card p-4"><h2 className="mb-3 font-medium">Latest events</h2><EventTable events={activeEvents} emptyMessage="No events recorded for this project and time range." /><p className="mt-3 text-xs text-muted-foreground">Showing up to 30 most recent events.</p></section>
          </>}
          {view === "api" && <>
            <MetricsGrid items={[{ label: "Requests", value: snapshot.api.requests.toLocaleString(), detail: `Within ${range}` }, { label: "Success rate", value: snapshot.api.successRate === null ? "—" : `${snapshot.api.successRate.toFixed(1)}%`, detail: `${snapshot.api.successes} successful` }, { label: "Errors", value: snapshot.api.errors.toLocaleString(), detail: "Failed or HTTP 4xx/5xx requests" }, { label: "p95 latency", value: snapshot.api.p95 === null ? "—" : `${snapshot.api.p95} ms`, detail: `p50 ${snapshot.api.p50 ?? "—"} · p99 ${snapshot.api.p99 ?? "—"} ms` }]} />
            <section className="rounded-xl border bg-card p-4"><h2 className="mb-3 font-medium">Request volume</h2><Sparkline points={apiSeries.map((p) => p.requests)} label="Requests" /></section>
            <section className="rounded-xl border bg-card p-4"><h2 className="mb-3 font-medium">Recent API requests</h2><EventTable events={apiEvents} emptyMessage="No API requests were recorded in this range." /></section>
          </>}
          {view === "errors" && <>
            <MetricsGrid items={[{ label: "All failures", value: totalErrors.toLocaleString(), detail: "API and SQL telemetry" }, { label: "API errors", value: snapshot.api.errors.toLocaleString(), detail: "Failed or HTTP error responses" }, { label: "SQL errors", value: snapshot.sql.errors.toLocaleString(), detail: "Qube SQL editor operations" }, { label: "Slow SQL", value: snapshot.sql.slowQueries.toLocaleString(), detail: "At least 1 second" }]} />
            <section className="rounded-xl border bg-card p-4"><h2 className="mb-3 font-medium">Recent failures</h2><EventTable events={failedEvents} emptyMessage="No failed operations were recorded in this range." /><p className="mt-3 text-xs text-muted-foreground">Failure rows are drawn from the latest 30 events returned by the API.</p></section>
            <Button asChild variant="outline" size="sm"><Link href={analyticsHref("api")}>Inspect API traffic</Link></Button>
          </>}
          {view === "performance" && <>
            <MetricsGrid items={[{ label: "API p50", value: snapshot.api.p50 === null ? "—" : `${snapshot.api.p50} ms`, detail: "Median request latency" }, { label: "API p95", value: snapshot.api.p95 === null ? "—" : `${snapshot.api.p95} ms`, detail: "95th percentile" }, { label: "API p99", value: snapshot.api.p99 === null ? "—" : `${snapshot.api.p99} ms`, detail: "99th percentile" }, { label: "Slow SQL", value: snapshot.sql.slowQueries.toLocaleString(), detail: `SQL p95 ${snapshot.sql.p95 === null ? "—" : `${snapshot.sql.p95} ms`}` }]} />
            <div className="grid gap-4 lg:grid-cols-2"><section className="rounded-xl border bg-card p-4"><h2 className="mb-3 font-medium">API request volume</h2><Sparkline points={apiSeries.map((p) => p.requests)} label="Requests" /></section><section className="rounded-xl border bg-card p-4"><h2 className="mb-3 font-medium">SQL query volume</h2><Sparkline points={sqlSeries.map((p) => p.requests)} label="Queries" /></section></div>
            <section className="rounded-xl border bg-card p-4"><h2 className="mb-3 font-medium">Slowest query fingerprints</h2>{snapshot.sql.topFingerprints.length ? <div className="divide-y">{snapshot.sql.topFingerprints.map((query) => <div key={query.fingerprint} className="flex flex-wrap justify-between gap-2 py-3 text-sm"><code>{query.fingerprint}</code><span className="text-muted-foreground">{query.count} runs · avg {query.avgLatencyMs ?? "—"} ms · max {query.maxLatencyMs ?? "—"} ms</span></div>)}</div> : <p className="py-8 text-center text-sm text-muted-foreground">No SQL query fingerprints recorded in this range.</p>}</section>
            <Button asChild variant="outline" size="sm"><Link href={`/organizations/${orgSlug}/${projectSlug}/sql`}>Open SQL editor</Link></Button>
          </>}
          {view === "realtime" && <>
            <MetricsGrid items={[{ label: "Connections opened", value: snapshot.realtime.connectionOpens.toLocaleString(), detail: `Within ${range}` }, { label: "Connections closed", value: snapshot.realtime.connectionCloses.toLocaleString(), detail: "Recorded CLOSE events" }, { label: "Subscriptions opened", value: snapshot.realtime.subscriptionOpens.toLocaleString(), detail: `${snapshot.realtime.subscriptionCloses} closed` }, { label: "Event deliveries", value: snapshot.realtime.deliveries.toLocaleString(), detail: "Recorded delivery events" }]} />
            <section className="rounded-xl border bg-card p-4"><h2 className="mb-3 font-medium">Realtime event activity</h2><Sparkline points={snapshot.realtime.series.map((point) => point.requests)} label="Events" /></section>
            <section className="rounded-xl border bg-card p-4"><h2 className="mb-3 font-medium">Recent realtime events</h2><EventTable events={eventsForView} emptyMessage="No realtime events were recorded in this range." /></section>
          </>}
          <p className="text-xs text-muted-foreground">Snapshot updated {formatTimestamp(snapshot.generatedAt)}. Metrics include instrumented Qube activity only; unavailable provider metrics are not inferred.</p>
        </>
      )}
    </main>
  );
}
