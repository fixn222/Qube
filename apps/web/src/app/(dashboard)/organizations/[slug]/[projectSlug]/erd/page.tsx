import { redirect } from 'next/navigation';

export default async function ErDiagramAlias({
  params,
}: {
  params: Promise<{ slug: string; projectSlug: string }>;
}) {
  const { slug, projectSlug } = await params;
  redirect(`/organizations/${slug}/${projectSlug}/analytics/data-model`);
}
