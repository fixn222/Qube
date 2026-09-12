import { redirect } from "next/navigation";
import apiClient from "@/lib/axios";
import { retriveTokenFromCookies } from "@/server-utils/utils";
import { COOKIE_KEYS } from "@qube/constants";
import type { Project, ProjectBySlugResponse } from "@qube/types";

export async function retrieveProjectForRealtime(
  orgSlug: string,
  projectSlug: string,
): Promise<Pick<Project, "id" | "anonKey">> {
  const token = await retriveTokenFromCookies();

  try {
    const { data } = await apiClient.get<ProjectBySlugResponse>(
      `/orgs/${orgSlug}/projects/${projectSlug}`,
      { headers: { Cookie: `${COOKIE_KEYS.ACCESS_TOKEN}=${token}` } },
    );

    return { id: data.projects.id, anonKey: data.projects.anonKey };
  } catch {
    redirect(`/organizations/${orgSlug}/projects`);
  }
}

export async function retrieveTablesForRealtime(
  orgSlug: string,
  projectSlug: string,
): Promise<string[]> {
  const token = await retriveTokenFromCookies();

  try {
    const { data } = await apiClient.get<string[]>(
      `/orgs/${orgSlug}/projects/${projectSlug}/tables`,
      { headers: { Cookie: `${COOKIE_KEYS.ACCESS_TOKEN}=${token}` } },
    );
    return data;
  } catch {
    return [];
  }
}
