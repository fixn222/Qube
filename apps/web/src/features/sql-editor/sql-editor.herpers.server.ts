import { redirect } from 'next/navigation';
import apiClient from '@/lib/axios';
import { retriveTokenFromCookies } from '@/server-utils/utils';
import { COOKIE_KEYS } from '@qube/constants';
import type { QueryHistorItem } from '@qube/types';

export async function retrieveSqlHistoryFromApi(
  orgSlug: string,
  projectSlug: string,
): Promise<QueryHistorItem[]> {
  const token = await retriveTokenFromCookies();

  try {
    const { data } = await apiClient.get<QueryHistorItem[]>(
      `/orgs/${orgSlug}/projects/${projectSlug}/sql/history`,
      { headers: { Cookie: `${COOKIE_KEYS.ACCESS_TOKEN}=${token}` } },
    );
    return data;
  } catch {
    redirect(`/organizations/${orgSlug}/projects`);
  }
}