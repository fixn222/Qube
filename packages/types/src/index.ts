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
  command? : string
}

export interface QueryHistorItem {
  id: string;
  projectId: string;
  sql: string;
  executionTimeMs: number;
  rowCount: number;
  createdAt: string;
}
