import { redirect } from 'next/navigation';
import apiClient from '@/lib/axios';
import { retriveTokenFromCookies } from '@/server-utils/utils';
import { COOKIE_KEYS } from '@qube/constants';
import type { OrgMemberWithUser } from '@qube/types';

export async function retrieveMembersFromApi(
  slug: string,
): Promise<OrgMemberWithUser[]> {
  const token = await retriveTokenFromCookies();

  try {
    const { data } = await apiClient.get<OrgMemberWithUser[]>(
      `/orgs/${slug}/members`,
      { headers: { Cookie: `${COOKIE_KEYS.ACCESS_TOKEN}=${token}` } },
    );
    return data;
  } catch {
    redirect('/organizations');
  }
}