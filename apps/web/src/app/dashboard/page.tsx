import { redirect } from "next/navigation"
import { retriveMyOrgsFromApi } from "@/features/organization/organization-helpers"
import { AppSidebar } from "../../../templates/app-sidebar";

export default async function DashBoardPage  ()  {

    const orgs = await retriveMyOrgsFromApi()

    console.log('ORG' , orgs);
    
    if (orgs.length === 1) {
        redirect (`/organizations/${orgs[0].slug}/projects`);
    }

 
    redirect('/organizations');

  return (
    
    <></>
  )
}
