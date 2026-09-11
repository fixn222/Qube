'use server';

import { revalidatePath } from 'next/cache';
import { COOKIE_KEYS } from '@qube/constants';
import { isAxiosError } from 'axios';
import apiClient from '@/lib/axios';
import { retriveTokenFromCookies } from '@/server-utils/utils';
import { OrganizationServerSchema } from './server.schema';
import { ORGANIZATION_INTENT } from './constants';

export type OrganizationActionState = {
  error?: string;
  success?: string;
};

export async function organizationAction(
  _prev: OrganizationActionState,
  formData: FormData,
): Promise<OrganizationActionState> {
  const parsed = OrganizationServerSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    return { error: parsed.error.flatten().formErrors[0] ?? 'Invalid input' };
  }

  try {
    if (parsed.data.intent === ORGANIZATION_INTENT.CREATE) {
      const token = await retriveTokenFromCookies();
      await apiClient.post(
        '/orgs',
        { name: parsed.data.name },
        { headers: { Cookie: `${COOKIE_KEYS.ACCESS_TOKEN}=${token}` } },
      );
      revalidatePath('/organizations');
      return { success: 'Organization created!' };
    }
  } catch (error: unknown) {
    const message = isAxiosError<{ message?: string | string[] }>(error)
      ? error.response?.data?.message
      : undefined;
    return {
      error: Array.isArray(message) ? message[0] : message ?? 'Something went wrong',
    };
  }

  return { error: 'Invalid request' };
}
