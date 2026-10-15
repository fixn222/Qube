import { redirect } from 'next/navigation';

export default async function LogsAlias({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string; projectSlug: string }>;
  searchParams: Promise<{ range?: string }>;
}) {
  const [{ slug, projectSlug }, query] = await Promise.all([params, searchParams]);
  const range = query.range ? `?range=${encodeURIComponent(query.range)}` : '';
  redirect(`/organizations/${slug}/${projectSlug}/analytics/events${range}`);
}
