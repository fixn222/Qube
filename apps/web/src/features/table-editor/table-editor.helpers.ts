import { redirect } from 'next/navigation';
import apiClient from '@/lib/axios';
import { retriveTokenFromCookies } from '@/server-utils/utils';
import { COOKIE_KEYS } from '@qube/constants';
import type { Project } from '@qube/types';

export async function retrieveTablesFromApi(
  orgSlug: string,
  projectSlug: string,
): Promise<string[]> {
  const token = await retriveTokenFromCookies();

  try {
    const { data } = await apiClient.get<string[]>(
      `/orgs/${orgSlug}/projects/${projectSlug}/tables`,
      { headers: { Cookie: `${COOKIE_KEYS.ACCESS_TOKEN}=${token}` } },
    );

    console.log(data)
    return data;

  } catch (error : any){

    console.log(error.message)   
    redirect(`/organizations/${orgSlug}/projects`);
  }
}

export async function retrieveProjectDbSchema(
  orgSlug: string,
  projectSlug: string,
): Promise<string> {
  const token = await retriveTokenFromCookies();

  try {
    const { data } = await apiClient.get<{ projects: Project }>(
      `/orgs/${orgSlug}/projects/${projectSlug}`,
      { headers: { Cookie: `${COOKIE_KEYS.ACCESS_TOKEN}=${token}` } },
    );
    return data.projects.dbSchema;
  } catch {
    redirect(`/organizations/${orgSlug}/projects`);
  }
}