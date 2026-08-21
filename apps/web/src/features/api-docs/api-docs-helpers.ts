import { redirect } from "next/navigation";
import apiClient from "@/lib/axios";
import { retriveTokenFromCookies } from "@/server-utils/utils";
import { COOKIE_KEYS } from "@qube/constants";
import type {
  ProjectApiDocs,
  ProjectApiEndpoint,
  ProjectBySlugResponse,
} from "@qube/types";

function buildEndpoints(
  projectUrl: string,
  tableName: string,
): ProjectApiEndpoint[] {
  const base = `${projectUrl}/rest/${tableName}`;

  return [
    {
      method: "GET",
      path: base,
      description: `Fetch rows from ${tableName}. Supports filters, ordering, pagination. Anon key OK.`,
      example: `curl "${base}?limit=10&order=created_at.desc" \\\n  -H "Authorization: Bearer <anon_key>"`,
    },
    {
      method: "GET",
      path: `${base}?col=eq.value`,
      description:
        "Filter rows. Operators: eq, neq, gt, gte, lt, lte, like, ilike, is.",
      example: `curl "${base}?name=eq.Shirt&price=lt.100" \\\n  -H "Authorization: Bearer <anon_key>"`,
    },
    {
      method: "POST",
      path: base,
      description: `Insert a row into ${tableName}. Requires service role key.`,
      example: `curl -X POST "${base}" \\\n  -H "Authorization: Bearer <service_role_key>" \\\n  -H "Content-Type: application/json" \\\n  -d '{"name":"T-Shirt"}'`,
    },
    {
      method: "PATCH",
      path: `${base}/:id`,
      description: `Update a row by primary key in ${tableName}. Requires service role key.`,
      example: `curl -X PATCH "${base}/1" \\\n  -H "Authorization: Bearer <service_role_key>" \\\n  -H "Content-Type: application/json" \\\n  -d '{"name":"Hoodie"}'`,
    },
    {
      method: "DELETE",
      path: `${base}/:id`,
      description: `Delete a row by primary key from ${tableName}. Requires service role key.`,
      example: `curl -X DELETE "${base}/1" \\\n  -H "Authorization: Bearer <service_role_key>"`,
    },
  ];
}

export async function retrieveApiDocsFromApi(
  orgSlug: string,
  projectSlug: string,
): Promise<ProjectApiDocs> {
  const token = await retriveTokenFromCookies();
  const headers = { Cookie: `${COOKIE_KEYS.ACCESS_TOKEN}=${token}` };

  try {
    const [projectRes, tablesRes] = await Promise.all([
      apiClient.get<ProjectBySlugResponse>(
        `/orgs/${orgSlug}/projects/${projectSlug}`,
        { headers },
      ),
      apiClient.get<string[]>(
        `/orgs/${orgSlug}/projects/${projectSlug}/tables`,
        { headers },
      ),
    ]);

    const project = projectRes.data.projects;
    const tableNames = tablesRes.data;

    return {
      projectUrl: project.projectUrl,
      anonKey: project.anonKey,
      serviceRoleKey: project.serviceRoleKey,
      tables: tableNames.map((name) => ({
        name,
        endpoints: buildEndpoints(project.projectUrl, name),
      })),
    };
  } catch {
    redirect(`/organizations/${orgSlug}/projects`);
  }
}
