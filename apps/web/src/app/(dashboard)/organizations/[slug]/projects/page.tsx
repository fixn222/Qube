import Link from 'next/link';
import { ArrowUpRight, Database, FolderKanban } from 'lucide-react';
import { retrieveOrgsBySlugFromApi } from '@/features/organization/organization-helpers';
import { retrieveProjectsFromApi } from '@/features/projects/project-helpers.server';
import { ORG_ROLES } from '@qube/constants';
import { CreateProjectModal } from '@/features/projects/create-project.modal';

export default async function ProjectsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const [org, projects] = await Promise.all([
    retrieveOrgsBySlugFromApi(slug),
    retrieveProjectsFromApi(slug),
  ]);

  const isAdmin = org.role === ORG_ROLES.ADMIN;

  return (
    <div className="mx-auto w-full max-w-7xl space-y-8">
      <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <p className="text-sm font-medium text-primary">{org.name}</p>
          <h1 className="text-3xl font-semibold tracking-tight">Projects</h1>
          <p className="max-w-xl text-sm leading-6 text-muted-foreground">
            Each project has its own database, storage, and API configuration.
          </p>
        </div>
        {isAdmin && projects.length > 0 && <CreateProjectModal slug={slug} />}
      </header>

      {projects.length === 0 ? (
        <section className="flex min-h-72 flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card px-6 py-14 text-center shadow-sm">
          <div className="mb-4 flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <FolderKanban size={22} />
          </div>
          <h2 className="text-lg font-semibold tracking-tight">No projects yet</h2>
          <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
            {isAdmin
              ? `Create a project in ${org.name} to start building your backend.`
              : 'Ask an organization admin to create the first project.'}
          </p>
          {isAdmin && (
            <div className="mt-6"><CreateProjectModal slug={slug} /></div>
          )}
        </section>
      ) : (
        <section aria-label="Projects" className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {projects.map((project) => (
            <Link
              key={project.id}
              href={`/organizations/${slug}/${project.slug}/overview`}
              className="group rounded-2xl border border-border/80 bg-card p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                  <Database size={19} />
                </div>
                <ArrowUpRight size={16} className="text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-primary" />
              </div>
              <h2 className="mt-5 truncate text-base font-semibold tracking-tight">{project.name}</h2>
              <p className="mt-1.5 truncate font-mono text-xs text-muted-foreground">
                {project.projectUrl}
              </p>
            </Link>
          ))}
        </section>
      )}
    </div>
  );
}
