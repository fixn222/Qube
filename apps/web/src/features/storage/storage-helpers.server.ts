import { redirect } from 'next/navigation';
import apiClient from '@/lib/axios';
import { retriveTokenFromCookies } from '@/server-utils/utils';
import { COOKIE_KEYS } from '@qube/constants';
import type { StorageBucket, StorageObject } from '@qube/types';

export async function retrieveBucketsFromApi(
  orgSlug: string,
  projectSlug: string,
): Promise<StorageBucket[]> {
  const token = await retriveTokenFromCookies();

  try {
    const { data } = await apiClient.get<StorageBucket[]>(
      `/orgs/${orgSlug}/projects/${projectSlug}/storage/buckets`,
      { headers: { Cookie: `${COOKIE_KEYS.ACCESS_TOKEN}=${token}` } },
    );
    return data;
  } catch {
    redirect(`/organizations/${orgSlug}/projects`);
  }
}

export async function retrieveObjectsFromApi(
  orgSlug: string,
  projectSlug: string,
  bucketId: string,
): Promise<StorageObject[]> {
  const token = await retriveTokenFromCookies();

  const { data } = await apiClient.get<StorageObject[]>(
    `/orgs/${orgSlug}/projects/${projectSlug}/storage/buckets/${bucketId}/objects`,
    { headers: { Cookie: `${COOKIE_KEYS.ACCESS_TOKEN}=${token}` } },
  );
  return data;
}