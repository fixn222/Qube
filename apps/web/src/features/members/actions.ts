'use server'


import { revalidatePath } from "next/cache";
import { memberServerSchema } from "./server.schema";
import { MEMBERS_INTENT } from "./constants";
import { retriveTokenFromCookies } from "@/server-utils/utils";
import apiClient from "@/lib/axios";
import { email, success } from "zod";
import { COOKIE_KEYS } from "@qube/constants";
// import { error } from "console";
// import { error } from "console";
// imrt { success } from "zod";
export type MembersActionState = {
    error?: string;
    success?: string;
};


export async function membersAction(
    { slug }: { slug: string },
    _prev: MembersActionState,
    formData: FormData
): Promise<MembersActionState> {
    const raw = Object.fromEntries(formData);
    const parsed = memberServerSchema.safeParse(raw);

    if (!parsed.success) {
        return { error: parsed.error.flatten().formErrors[0] ?? 'Invalid input' };
    }

    const token = await retriveTokenFromCookies();

    const { intent, ...data } = parsed.data;

    try {
        switch (intent) {
            case MEMBERS_INTENT.INVITE: {

                await apiClient.post(
                    `/orgs/${slug}/members/invite`,
                    { email: (data as { email: string }).email },
                    { headers: { Cookie: `${COOKIE_KEYS.ACCESS_TOKEN}=${token}` } },
                );

                revalidatePath(`/organizations/${slug}/settings/members`);

                return { success: 'Invite sent!' };

            }

            case MEMBERS_INTENT.UPDATE_ROLE: {
                const { memberId, role } = data as { memberId: string, role: string };

                await apiClient.patch(
                    `/orgs/${slug}/members/${memberId}/role`,

                    { role },
                    { headers: { Cookie: `${COOKIE_KEYS.ACCESS_TOKEN}=${token}` } }
                )
                revalidatePath(`/organizations/${slug}/settings/members`);

                    console.log(intent)

                return {success : 'Role updated'}

            }

            case MEMBERS_INTENT.REMOVE : {
                const {memberId} = data as {memberId : string};
                await apiClient.delete(`/orgs/${slug}/members/${memberId}` , {
                    headers : {Cookie : `${COOKIE_KEYS.ACCESS_TOKEN}=${token}`} ,
                });
               revalidatePath(`/organizations/${slug}/settings/members`);
               return {success : 'Member removed'}
            }

        }
    } catch (err: any) {
        return {error : err.response?.data?.message ?? 'Something went wrong'}

    }
}




