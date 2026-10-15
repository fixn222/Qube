export interface User {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export type OrgRole = "admin" | "developer";

export interface Organization {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
  updatedAt: string;
}

export interface Orgmember {
  id: string;
  orgId: string;
  role: OrgRole;
  createdAt: string;
}

export interface Project {
  id: string;
  orgId: string;
  name: string;
  slug: string;
  dbSchema: string;
  projectUrl: string;
  anonKey: string;
  serviceRoleKey: string;
  createdAt: string;
  updatedAt: string;
}

export interface RegisterInput {
  email: string;
  password: string;
  name: string;
}
export interface LoginInput {
  email: string;
  password: string;
}
export interface AuthToken {
  aceesToken: string;
  refreshToken: string;
}

export interface JwtPayload {
  sub: string;
  email: string;
}

export interface CreateOrgInput {
  name: string;
}

export interface OrganizationWithMeta extends Organization {
  memberCount: number;
  projectCount: number;
  role: OrgRole;
}

export interface OrgMemberWithUser {
  id: string;
  role: string;
  createdAt: string;
  user: {
    id: string;
    name: string | null;
    email: string;
    avatarUrl: string | null;
  };
}

export interface InviteMemberInput {
  email: string;
}

export interface UpdateRoleInput {
  role: OrgRole;
}

export interface CreateProjectInput {
  name: string;
}
export interface ProjectWithOrg extends Project {
  org: Pick<Organization, "id" | "name" | "slug">;
}

export type ColumnType =
  | "text"
  | "integer"
  | "bigint"
  | "boolean"
  | "timestamp"
  | "uuid"
  | "jsonb"
  | "numeric";

export interface TableCol {
  name: string;
  type: ColumnType;
  isNullable: boolean;
  isPrimaryKey: boolean;
  defaultValue: string | null;
  foreignKey: {
    table: string;
    column: string;
  } | null;
}

export interface TableInfo {
  name: string;
  columns: TableCol[];
}

export type SchemaConstraintType = 'primary_key' | 'foreign_key' | 'unique' | 'check';
export type SchemaCardinality = 'one_to_one' | 'many_to_one';

export interface SchemaColumn {
  name: string;
  ordinal: number;
  dataType: string;
  nullable: boolean;
  defaultValue: string | null;
  primaryKey: boolean;
  unique: boolean;
}

export interface SchemaConstraint {
  name: string;
  type: SchemaConstraintType;
  columns: string[];
  referencedSchema?: string;
  referencedTable?: string;
  referencedColumns?: string[];
  onUpdate?: string;
  onDelete?: string;
  definition: string;
}

export interface SchemaIndex {
  name: string;
  columns: string[];
  unique: boolean;
  primary: boolean;
  partial: boolean;
  method: string;
  definition: string;
}

export interface SchemaTable {
  schema: string;
  name: string;
  columns: SchemaColumn[];
  constraints: SchemaConstraint[];
  indexes: SchemaIndex[];
  estimatedRows: number | null;
  sizeBytes: number | null;
  isJunctionCandidate: boolean;
}

export interface SchemaRelationship {
  id: string;
  constraintName: string;
  fromSchema: string;
  fromTable: string;
  fromColumns: string[];
  toSchema: string;
  toTable: string;
  toColumns: string[];
  cardinality: SchemaCardinality;
  optional: boolean;
  source: 'constraint';
}

export interface SchemaRelationshipSuggestion {
  id: string;
  fromTable: string;
  toTable: string;
  throughTable: string;
  source: 'inferred';
}

export interface ProjectSchemaSnapshot {
  schema: string;
  capturedAt: string;
  schemaHash: string;
  tables: SchemaTable[];
  relationships: SchemaRelationship[];
  suggestions: SchemaRelationshipSuggestion[];
}

export type ObservatoryRange = '1h' | '24h' | '7d' | '30d';

export interface ObservatorySeriesPoint {
  at: string;
  requests: number;
  successes: number;
  errors: number;
  avgLatencyMs: number | null;
  p50: number | null;
  p95: number | null;
  p99: number | null;
}

export interface ObservatorySnapshot {
  generatedAt: string;
  range: ObservatoryRange;
  totalEvents: number;
  totalErrors: number;
  telemetryStatus: 'ready' | 'migration_required';
  telemetryAvailableSince: string | null;
  project: { id: string; name: string; slug: string; schema: string };
  database: {
    tableCount: number;
    estimatedRows: number | null;
    sizeBytes: number | null;
  };
  health: { status: 'operational' | 'degraded' | 'unknown'; detail: string };
  api: {
    requests: number;
    successes: number;
    errors: number;
    successRate: number | null;
    avgLatencyMs: number | null;
    p50: number | null;
    p95: number | null;
    p99: number | null;
    series: ObservatorySeriesPoint[];
  };
  sql: {
    queries: number;
    errors: number;
    slowQueries: number;
    avgLatencyMs: number | null;
    p50: number | null;
    p95: number | null;
    p99: number | null;
    series: ObservatorySeriesPoint[];
    topFingerprints: Array<{ fingerprint: string; count: number; avgLatencyMs: number | null; maxLatencyMs: number | null }>;
  };
  realtime: {
    connectionOpens: number;
    connectionCloses: number;
    subscriptionOpens: number;
    subscriptionCloses: number;
    deliveries: number;
    series: ObservatorySeriesPoint[];
  };
  recentEvents: Array<{
    id: string;
    eventType: string;
    source: string;
    occurredAt: string;
    operation: string | null;
    resource: string | null;
    durationMs: number | null;
    statusCode: number | null;
    success: boolean | null;
    errorCode: string | null;
  }>;
}

export interface CreateColInput {
  name: string;
  type: ColumnType;
  isNullable: boolean;
  isPrimaryKey: boolean;
  defaultValue?: string;
  foreignKeyTable?: string;
  foreignKeyColumn?: string;
}

export interface CreateTableInput {
  name: string;
  columns: CreateColInput[];
}

//API docs

export interface ProjectApiEndpoint {
  method: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  path: string;
  description: string;
  example: string;
}

export interface ProjectApiDocs {
  projectUrl: string;
  anonKey: string;
  serviceRoleKey: string;
  tables: {
    name: string;
    endpoints: ProjectApiEndpoint[];
  }[];
}

export interface ProjectBySlugResponse {
  projects: Project;
  organizations: Organization;
  org_members: Orgmember;
}

export interface QueryResult {
  rows: Record<string, unknown>[];
  columns: string[];
  rowCount: number;
  executionTimeMs: number;
  command?: string;
}

export interface QueryHistorItem {
  id: string;
  projectId: string;
  sql: string;
  executionTimeMs: number;
  rowCount: number;
  createdAt: string;
}

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

export type BucketAccess = "public" | "private";

export interface StorageBucket {
  id: string;
  projectId: string;
  name: string;
  access: string;
  createdAt: string;
}

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
export interface CreatedBucketInput {
  name: string;
  access: BucketAccess;
}
