'use client';

import { useParams } from 'next/navigation';
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
  const currentProject = projects.find((p) => p.slug === params?.projectSlug);

  console.log('projects', projects);

  return (
    <header className="flex h-12 shrink-0 items-center gap-2 border-b px-4">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-2 h-4" />

      {params?.slug && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="gap-1.5 font-normal">
              <span className="text-sm">
                {currentProject?.name ?? 'Select project'}
              </span>
              <ChevronsUpDown size={12} className="text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            {projects.map((project) => (
              <DropdownMenuItem key={project.id} asChild>
                <Link
                  href={`/organizations/${params.slug}/${project.slug}/database`}
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