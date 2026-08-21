import { retrieveApiDocsFromApi } from "@/features/api-docs/api-docs-helpers";
import { ApiDocsClient } from "@/features/api-docs/api-docs-client";

export default async function ApiDocsPage({
  params,
}: {
  params: Promise<{ slug: string; projectSlug: string }>;
}) {
  const { slug, projectSlug } = await params;
  const docs = await retrieveApiDocsFromApi(slug, projectSlug);

  return <ApiDocsClient docs={docs} />;
}
