import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { TopNav } from "@/components/top-nav";
import { retriveTokenFromCookies } from "@/server-utils/utils";
import { retriveMyOrgsFromApi } from "@/features/organization/organization-helpers";
import { TooltipProvider } from "@/components/ui/tooltip";

async function getCurrentUser() {
  const token = await retriveTokenFromCookies();


  const payload = JSON.parse(
    Buffer.from(token.split(".")[1], "base64").toString(),
  );
  return { email: payload.email as string, name: null };
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [orgs, user] = await Promise.all([
    retriveMyOrgsFromApi(),
    getCurrentUser(),
  ]);
  return (
    <TooltipProvider >

  <SidebarProvider>
      <AppSidebar orgs={orgs} user={user} />
      <SidebarInset>
        {/* <TopNav/> */}
       {children}
      </SidebarInset>
    </SidebarProvider>
    </TooltipProvider>
  );
}
