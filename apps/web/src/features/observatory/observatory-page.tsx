import type { ObservatoryRange } from '@qube/types';
import { ObservatoryClient, type ObservatoryView } from './observatory-client';
import { retrieveObservatorySnapshot } from './observatory-helpers.server';

const ranges = new Set<ObservatoryRange>(['1h', '24h', '7d', '30d']);

export async function ObservatoryPage({
  params,
  searchParams,
  view,
}: {
  params: Promise<{ slug: string; projectSlug: string }>;
  searchParams?: Promise<{ range?: string }>;
  view: ObservatoryView;
}) {
  const [{ slug, projectSlug }, query] = await Promise.all([
    params,
    searchParams ?? Promise.resolve({ range: undefined }),
  ]);
  const range = ranges.has(query.range as ObservatoryRange)
    ? (query.range as ObservatoryRange)
    : '24h';
  const snapshot = await retrieveObservatorySnapshot(slug, projectSlug, range);

  return (
    <ObservatoryClient
      orgSlug={slug}
      projectSlug={projectSlug}
      initialSnapshot={snapshot}
      initialRange={range}
      view={view}
    />
  );
}
