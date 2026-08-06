import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { COOKIE_KEYS } from "@qube/constants";


export async function retriveTokenFromCookies() : Promise<string> {

    const cookieStore = await cookies();

    const token = cookieStore.get(COOKIE_KEYS.ACCESS_TOKEN)?.value ;

    // console.log("",token)

    if(!token) redirect('/login');

    return token;
   

    
}