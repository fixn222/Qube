import { TopNav } from '@/components/top-nav';
import { retrieveProjectsFromApi } from '@/features/projects/project-helpers.server';

export default async function OrgLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const projects = await retrieveProjectsFromApi(slug);

  console.log(projects)

  return (
    <>
      {/* <TopNav projects={projects} /> */}
      <main className="flex-1 overflow-y-auto p-6">{children}</main>
    </>
  );
}