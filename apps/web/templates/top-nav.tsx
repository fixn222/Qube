'use client';

import { useParams } from 'next/navigation';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { ChevronsUpDown } from 'lucide-react';

export function TopNav() {
  const params = useParams<{ slug: string }>();

  return (
    <header className="flex h-12 shrink-0 items-center gap-2 border-b px-4">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-2 h-4" />

      {/* Project switcher — placeholder */}
      {params?.slug && (
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5 font-normal"
          disabled
        >
          <span className="text-sm text-muted-foreground">Select project</span>
          <ChevronsUpDown size={12} className="text-muted-foreground" />
        </Button>
      )}
    </header>
  );
}
