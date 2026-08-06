import Link from 'next/link';
import { Plus, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { retriveMyOrgsFromApi } from '@/features/organization/organization-helpers';

export default async function OrganizationsPage() {
  const orgs = await retriveMyOrgsFromApi();

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-medium">Your Organizations</h1>
        <Button asChild size="sm">
          <Link href="/organizations/new">
            <Plus size={14} className="mr-1.5" />
            New organization
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {orgs.map((org) => (
          <Link
            key={org.id}
            href={`/organizations/${org.slug}/projects`}
            className="flex items-center gap-4 p-5 rounded-xl border border-border bg-background hover:bg-accent transition-colors"
          >
            <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
              <Building2 size={18} className="text-muted-foreground" />
            </div>
            <div className="min-w-0">
              <p className="font-medium text-sm truncate">{org.name}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {org.projectCount}{' '}
                {org.projectCount === 1 ? 'project' : 'projects'} -{' '}
                {org.memberCount} {org.memberCount === 1 ? 'member' : 'members'}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}