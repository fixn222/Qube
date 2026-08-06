'use server'

import { revalidatePath } from "next/cache"
import { ProjectServerSchema } from "./server.schema"
import { COOKIE_KEYS } from "@qube/constants"
import { retriveTokenFromCookies } from "@/server-utils/utils"
import apiClient from "@/lib/axios"

import { PROJECT_INTENT } from "./constants"

export type ProjectActionState = {
    error?: string,
    success?: string
}

export async function projectAction(
    { slug }: { slug: string },
    _prev: ProjectActionState,
    formData: FormData
): Promise<ProjectActionState> {

    const raw = Object.fromEntries(formData);
    const parsed = ProjectServerSchema.safeParse(raw);

    if (!parsed.success) {
        return { error: parsed.error.flatten().formErrors[0] ?? 'Invalid input' };
    }


    const token = await retriveTokenFromCookies();
    const { intent, ...data } = parsed.data;

     try {
    switch (intent) {
      case PROJECT_INTENT.CREATE: {
        await apiClient.post(
          `/orgs/${slug}/projects`,
          { name: (data as { name: string }).name },
          { headers: { Cookie: `${COOKIE_KEYS.ACCESS_TOKEN}=${token}` } },
        );
        revalidatePath(`/organizations/${slug}/projects`);
        return { success: 'Project created!' };
      }
    }
}catch (e : any){
        
  return { error: e.response?.data?.message ?? 'Something went wrong' };

}
}