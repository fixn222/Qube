import { retrieveSqlHistoryFromApi } from '@/features/sql-editor/sql-editor.herpers.server';
import { SqlEditorClient } from '@/features/sql-editor/sql-editor-client';

export default async function SqlEditorPage({
  params,
}: {
  params: Promise<{ slug: string; projectSlug: string }>;
}) {
  const { slug, projectSlug } = await params;
  const history = await retrieveSqlHistoryFromApi(slug, projectSlug);

  return (
    <div className="-mx-6 -mt-6 -mb-6 flex h-[calc(100svh-3rem)] min-h-0 flex-col overflow-hidden">
      <SqlEditorClient
        orgSlug={slug}
        projectSlug={projectSlug}
        initialHistory={history}
      />
    </div>
  );
}