import { redirect } from "next/navigation";
import apiClient from "@/lib/axios";
import { retriveTokenFromCookies } from "@/server-utils/utils";
import { OrganizationWithMeta } from "@qube/types";
import { COOKIE_KEYS } from "@qube/constants";
// import { da } from "zod/locales";


export async function retriveMyOrgsFromApi() : Promise<OrganizationWithMeta[]> {

    const token = await retriveTokenFromCookies();
    // console.log(token , "ho")
    try {
        const {data} = await apiClient.get<OrganizationWithMeta[]>('/orgs' , {
            headers : {
                Cookie : `${COOKIE_KEYS.ACCESS_TOKEN}=${token}`
            },
        });
        return data;
 
 
    } catch (error) {
        redirect('/login')       
    }
    

}

export async function retrieveOrgsBySlugFromApi(slug : string ) {

    const token = await retriveTokenFromCookies();

    try {
        const {data} = await apiClient.get(`/orgs/${slug}` , {
            headers : {
               Cookie : `${COOKIE_KEYS.ACCESS_TOKEN}=${token}`
            }
            
        }) 
        return data;
    } catch (error) {
        redirect('/organizations');
        
    }



    
}