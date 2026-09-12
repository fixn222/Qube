import {
  retrieveProjectForRealtime,
  retrieveTablesForRealtime,
} from "@/features/realtime/realtime-helpers.server";
import { RealtimeClient } from "@/features/realtime/realtime-client";

export default async function RealtimePage({
  params,
}: {
  params: Promise<{ slug: string; projectSlug: string }>;
}) {
  const { slug, projectSlug } = await params;

  const [project, tables] = await Promise.all([
    retrieveProjectForRealtime(slug, projectSlug),
    retrieveTablesForRealtime(slug, projectSlug),
  ]);

  return (
    <RealtimeClient
      orgSlug={slug}
      projectSlug={projectSlug}
      projectId={project.id}
      anonKey={project.anonKey}
      tables={tables}
    />
  );
}
