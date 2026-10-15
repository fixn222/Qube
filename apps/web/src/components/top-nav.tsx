'use client';

import { useParams, usePathname, useSearchParams } from 'next/navigation';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Check, ChevronsUpDown } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { Project } from '@qube/types';
import Link from 'next/link';

interface TopNavProps {
  projects: Project[];
}

export function TopNav({ projects }: TopNavProps) {
  const params = useParams<{ slug: string; projectSlug: string }>();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentProject = projects.find((p) => p.slug === params?.projectSlug);
  const projectPath = pathname.replace(
    `/organizations/${params?.slug}/${params?.projectSlug}`,
    '',
  );
  const query = searchParams.toString();

  return (
    <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-3 border-b border-border/80 bg-background/90 px-4 backdrop-blur-xl md:px-6">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-2 h-4" />

      {params?.slug && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="gap-1.5 font-normal">
              <span className="max-w-48 truncate text-sm font-medium">
                {currentProject?.name ?? 'Select project'}
              </span>
              <ChevronsUpDown size={12} className="text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-60 rounded-xl p-1.5 shadow-xl">
            {projects.map((project) => (
              <DropdownMenuItem key={project.id} asChild>
                <Link
                  href={`/organizations/${params.slug}/${project.slug}${projectPath || '/overview'}${query ? `?${query}` : ''}`}
                  className="flex items-center justify-between"
                >
                  <span>{project.name}</span>
                  {project.slug === params?.projectSlug && (
                    <Check size={14} className="text-muted-foreground" />
                  )}
                </Link>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href={`/organizations/${params.slug}/projects`}>
                All projects
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </header>
  );
}
