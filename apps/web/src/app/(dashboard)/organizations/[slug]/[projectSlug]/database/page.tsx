import { TableEditorClient } from "@/features/table-editor/table-editor-client";
import {
  retrieveTablesFromApi,
  retrieveProjectDbSchema,
} from "@/features/table-editor/table-editor.helpers";

export default async function DatabasePage({
  params,
}: {
  params: Promise<{ slug: string; projectSlug: string }>;
}) {
  const { slug, projectSlug } = await params;

  const [tables, dbSchema] = await Promise.all([
    retrieveTablesFromApi(slug, projectSlug),
    retrieveProjectDbSchema(slug, projectSlug),
  ]);

  return (
    <div className="-mx-4 -mt-4 -mb-4 flex h-[calc(100svh-3.5rem)] min-h-0 flex-col overflow-hidden sm:-mx-6 sm:-mt-6 sm:-mb-6 lg:-mx-8 lg:-mt-8 lg:-mb-8">
      <TableEditorClient
        orgSlug={slug}
        projectSlug={projectSlug}
        dbSchema={dbSchema}
        initialTables={tables}
      />
    </div>
  );
}
