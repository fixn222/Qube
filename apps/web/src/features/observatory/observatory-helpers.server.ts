import apiClient from '@/lib/axios';
import { retriveTokenFromCookies } from '@/server-utils/utils';
import { COOKIE_KEYS } from '@qube/constants';
import type { ObservatoryRange, ObservatorySnapshot } from '@qube/types';

export async function retrieveObservatorySnapshot(
  orgSlug: string,
  projectSlug: string,
  range: ObservatoryRange = '24h',
): Promise<ObservatorySnapshot | null> {
  try {
    const token = await retriveTokenFromCookies();
    const { data } = await apiClient.get<ObservatorySnapshot>(
      `/orgs/${orgSlug}/projects/${projectSlug}/observatory`,
      {
        headers: { Cookie: `${COOKIE_KEYS.ACCESS_TOKEN}=${token}` },
        params: { range },
      },
    );
    return data;
  } catch {
    return null;
  }
}
