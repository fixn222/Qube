import Link from 'next/link';
import { Database } from 'lucide-react';
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
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-medium">Projects</h1>
        {isAdmin && <CreateProjectModal slug={slug} />}
      </div>

      {/* Empty state */}
      {projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center border border-dashed border-border rounded-xl">
          <p className="text-muted-foreground text-sm">
            No projects yet in {org.name}
          </p>
          <p className="text-muted-foreground text-xs mt-1">
            Create your first project to get started
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((project) => (
            <Link
              key={project.id}
              href={`/organizations/${slug}/${project.slug}/database`}
              className="flex items-center gap-4 p-5 rounded-xl border border-border bg-background hover:bg-accent transition-colors"
            >
              <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                <Database size={18} className="text-muted-foreground" />
              </div>
              <div className="min-w-0">
                <p className="font-medium text-sm truncate">{project.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5 truncate">
                  {project.projectUrl}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}