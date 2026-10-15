import Link from 'next/link';
import { ArrowUpRight, Building2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { retriveMyOrgsFromApi } from '@/features/organization/organization-helpers';

export default async function OrganizationsPage() {
  const orgs = await retriveMyOrgsFromApi();

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <p className="text-sm font-medium text-primary">Workspace</p>
          <h1 className="text-3xl font-semibold tracking-tight">Organizations</h1>
          <p className="max-w-xl text-sm leading-6 text-muted-foreground">
            Keep your projects and collaborators together in one place.
          </p>
        </div>
        <Button asChild className="w-full shadow-sm shadow-primary/15 sm:w-auto">
          <Link href="/organizations/new">
            <Plus className="mr-1.5" />
            New organization
          </Link>
        </Button>
      </header>

      {orgs.length === 0 ? (
        <section className="flex min-h-72 flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card px-6 py-14 text-center shadow-sm">
          <div className="mb-4 flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Building2 size={22} />
          </div>
          <h2 className="text-lg font-semibold tracking-tight">Create your first organization</h2>
          <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
            Organizations give your projects a shared home for team access and settings.
          </p>
          <Button asChild className="mt-6">
            <Link href="/organizations/new"><Plus className="mr-1.5" />Create organization</Link>
          </Button>
        </section>
      ) : (
        <section aria-label="Your organizations" className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {orgs.map((org) => (
            <Link
              key={org.id}
              href={`/organizations/${org.slug}/projects`}
              className="group rounded-2xl border border-border/80 bg-card p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                  <Building2 size={19} />
                </div>
                <ArrowUpRight size={16} className="text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-primary" />
              </div>
              <h2 className="mt-5 truncate text-base font-semibold tracking-tight">{org.name}</h2>
              <p className="mt-1.5 text-sm text-muted-foreground">
                {org.projectCount} {org.projectCount === 1 ? 'project' : 'projects'}
                <span className="mx-2 text-border">·</span>
                {org.memberCount} {org.memberCount === 1 ? 'member' : 'members'}
              </p>
            </Link>
          ))}
        </section>
      )}
    </div>
  );
}
