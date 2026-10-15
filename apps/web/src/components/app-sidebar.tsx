"use client";

import Link from "next/link";
import { useState } from "react";
import { useParams, usePathname, useSearchParams } from "next/navigation";
import {
  Activity,
  Eye,
  Gauge,
  Settings,
  GitBranch,
  Table2,
  Code2,
  Radio,
  Building2,
  ChevronsUpDown,
  ChevronDown,
  Plus,
  Check,
  LogOut,
  TerminalIcon,
  FolderKanban,
  ListTree,
  ChartNoAxesCombined,
  TriangleAlert,
  type LucideIcon,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { signOut } from "@/features/auth/signout";
import { ThemeToggle } from "@/components/theme-toogle";
import { cn } from "@/lib/utils";
import { OrganizationWithMeta } from "@qube/types";

const workspaceItems = [
  { icon: Eye, label: "Project overview", segment: "overview", org: false },
  { icon: FolderKanban, label: "Projects", segment: "projects", org: true },
  { icon: Settings, label: "Project settings", segment: "settings", org: false },
] as const;

const analyticsItems = [
  { icon: ChartNoAxesCombined, label: "Overview", segment: "analytics" },
  { icon: ListTree, label: "Events & activity", segment: "analytics/events" },
  { icon: Activity, label: "API usage & traffic", segment: "analytics/api" },
  { icon: Gauge, label: "Performance & latency", segment: "analytics/performance" },
  { icon: TriangleAlert, label: "Errors & failures", segment: "analytics/errors" },
  { icon: GitBranch, label: "Database Explorer", segment: "analytics/data-model" },
  { icon: Radio, label: "Realtime activity", segment: "analytics/realtime" },
] as const;

const developerItems = [
  { icon: TerminalIcon, label: "SQL Editor", segment: "sql" },
  { icon: Code2, label: "API Explorer", segment: "api" },
  { icon: Table2, label: "Database tables", segment: "database" },
  { icon: FolderKanban, label: "Storage", segment: "storage" },
  { icon: Radio, label: "Realtime", segment: "realtime" },
] as const;

const administrationItems = [
  { icon: Building2, label: "Team & access", segment: "settings/members", org: true },
] as const;

function buildNavHref(
  orgSlug: string | undefined,
  projectSlug: string | undefined,
  segment: string,
  scope: "org" | "project",
): string {
  if (!orgSlug) return "/organizations";

  if (scope === "org") {
    return `/organizations/${orgSlug}/${segment}`;
  }

  if (projectSlug) {
    return `/organizations/${orgSlug}/${projectSlug}/${segment}`;
  }

  return `/organizations/${orgSlug}/projects`;
}

function isNavItemActive(
  pathname: string,
  orgSlug: string | undefined,
  projectSlug: string | undefined,
  segment: string,
  scope: "org" | "project",
): boolean {
  if (!orgSlug) return false;

  if (scope === "org") {
    const base = `/organizations/${orgSlug}/${segment}`;
    return pathname === base || pathname.startsWith(`${base}/`);
  }

  if (!projectSlug) return false;

  const base = `/organizations/${orgSlug}/${projectSlug}/${segment}`;
  if (segment === "analytics") return pathname === base;
  return pathname === base || pathname.startsWith(`${base}/`);
}

function navLinkClass(isActive: boolean) {
  return cn(
    "bg-transparent text-muted-foreground shadow-none",
    "hover:bg-muted/60 hover:text-foreground",
    isActive && "bg-muted font-medium text-foreground hover:bg-muted",
  );
}

function NavigationSection({
  title,
  items,
  pathname,
  orgSlug,
  projectSlug,
  range,
}: {
  title: string;
  items: ReadonlyArray<{
    icon: LucideIcon;
    label: string;
    segment: string;
    org?: boolean;
  }>;
  pathname: string;
  orgSlug?: string;
  projectSlug?: string;
  range?: string | null;
}) {
  const sectionActive = items.some(({ segment, org }) =>
    isNavItemActive(pathname, orgSlug, projectSlug, segment, org ? "org" : "project"),
  );
  const SectionIcon = items[0]?.icon;
  const [open, setOpen] = useState(sectionActive);

  return (
    <SidebarGroup className="py-1">
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton
            type="button"
            onClick={() => setOpen((value) => !value)}
            isActive={sectionActive}
            tooltip={title}
            aria-expanded={open}
            className={cn(navLinkClass(sectionActive), "font-medium")}
          >
            {SectionIcon && <SectionIcon />}
            <span>{title}</span>
            <ChevronDown className={cn("ml-auto transition-transform", open && "rotate-180")} />
          </SidebarMenuButton>
          {open && (
            <SidebarMenuSub>
              {items.map(({ icon: Icon, label, segment, org }) => {
                const href = buildNavHref(orgSlug, projectSlug, segment, org ? "org" : "project") + ((segment === "analytics" || segment.startsWith("analytics/")) && range ? `?range=${encodeURIComponent(range)}` : "");
                const active = isNavItemActive(pathname, orgSlug, projectSlug, segment, org ? "org" : "project");
                return (
                  <SidebarMenuSubItem key={segment}>
                    <SidebarMenuSubButton asChild isActive={active}>
                      <Link href={href} aria-current={active ? "page" : undefined}>
                        <Icon />
                        <span>{label}</span>
                      </Link>
                    </SidebarMenuSubButton>
                  </SidebarMenuSubItem>
                );
              })}
            </SidebarMenuSub>
          )}
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarGroup>
  );
}

interface AppSidebarProps {
  orgs: OrganizationWithMeta[];
  user: { email: string; name: string | null };
}

export function AppSidebar({ orgs, user }: AppSidebarProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const params = useParams<{ slug: string; projectSlug?: string }>();
  const currentOrg = orgs.find((org) => org.slug === params?.slug) ?? orgs[0];
  const orgSlug = params?.slug;
  const projectSlug = params?.projectSlug;

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="data-[state=open]:bg-sidebar-accent"
                >
                  <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                    <Building2 size={16} />
                  </div>
                  <div className="flex flex-col gap-0.5 leading-none">
                    <span className="font-semibold">{currentOrg?.name ?? "Qube workspace"}</span>
                    <span className="text-xs text-muted-foreground capitalize">
                      {currentOrg?.role ?? "Select an organization"}
                    </span>
                  </div>
                  <ChevronsUpDown className="ml-auto" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-[--radix-popper-anchor-width]"
                align="start"
              >
                {orgs.map((org) => (
                  <DropdownMenuItem key={org.id} asChild>
                    <Link
                      href={`/organizations/${org.slug}/projects`}
                      className="flex items-center justify-between"
                    >
                      <span>{org.name}</span>
                      {org.slug === params?.slug && <Check size={14} />}
                    </Link>
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/organizations">All organizations</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link
                    href="/organizations/new"
                    className="flex items-center gap-1.5"
                  >
                    <Plus size={14} />
                    New organization
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup className="py-1">
          <SidebarGroupContent>
            <SidebarMenu>
              {workspaceItems.map(({ icon: Icon, label, segment, org }) => {
                const href = buildNavHref(orgSlug, projectSlug, segment, org ? "org" : "project");
                const active = isNavItemActive(pathname, orgSlug, projectSlug, segment, org ? "org" : "project");
                return (
                  <SidebarMenuItem key={segment}>
                    <SidebarMenuButton asChild isActive={active} tooltip={label} className={navLinkClass(active)}>
                      <Link href={href} aria-current={active ? "page" : undefined}><Icon /><span>{label}</span></Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <NavigationSection key={`analytics-${pathname.startsWith(`/organizations/${orgSlug}/${projectSlug}/analytics`)}`} title="Analytics" items={analyticsItems} pathname={pathname} orgSlug={orgSlug} projectSlug={projectSlug} range={searchParams.get("range")} />
        <NavigationSection key={`developer-${pathname.startsWith(`/organizations/${orgSlug}/${projectSlug}/`)}`} title="Developer tools" items={developerItems} pathname={pathname} orgSlug={orgSlug} projectSlug={projectSlug} />
        <NavigationSection key={`admin-${pathname.includes("/settings/members")}`} title="Administration" items={administrationItems} pathname={pathname} orgSlug={orgSlug} projectSlug={projectSlug} />
      </SidebarContent>

      <SidebarFooter>
        <div className="flex items-center gap-2 px-2 pb-2">
          <ThemeToggle />
          <span className="text-xs text-muted-foreground group-data-[collapsible=icon]:hidden">
            Appearance
          </span>
        </div>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="data-[state=open]:bg-sidebar-accent"
                >
                  <Avatar className="size-8 rounded-lg">
                    <AvatarFallback className="rounded-lg">
                      {(user.name ?? user.email).charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col gap-0.5 leading-none">
                    <span className="font-semibold">
                      {user.name ?? "Account"}
                    </span>
                    <span className="text-xs text-muted-foreground truncate">
                      {user.email}
                    </span>
                  </div>
                  <ChevronsUpDown className="ml-auto" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-[--radix-popper-anchor-width]"
                side="top"
                align="start"
              >
                <DropdownMenuItem asChild>
                  <Link
                    href={`/organizations/${orgSlug ?? currentOrg?.slug}/settings/members`}
                  >
                    Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  asChild
                  onSelect={(event) => event.preventDefault()}
                >
                  <form action={signOut}>
                    <button
                      type="submit"
                      className="flex w-full items-center gap-1.5 text-destructive text-sm"
                    >
                      <LogOut size={14} />
                      Sign out
                    </button>
                  </form>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
