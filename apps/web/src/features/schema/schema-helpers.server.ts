import apiClient from '@/lib/axios';
import { retriveTokenFromCookies } from '@/server-utils/utils';
import { COOKIE_KEYS } from '@qube/constants';
import type { ProjectSchemaSnapshot } from '@qube/types';

export async function retrieveProjectSchemaSnapshot(
  orgSlug: string,
  projectSlug: string,
): Promise<ProjectSchemaSnapshot | null> {
  try {
    const token = await retriveTokenFromCookies();
    const { data } = await apiClient.get<ProjectSchemaSnapshot>(
      `/orgs/${orgSlug}/projects/${projectSlug}/schema`,
      { headers: { Cookie: `${COOKIE_KEYS.ACCESS_TOKEN}=${token}` } },
    );
    return data;
  } catch {
    return null;
  }
}
