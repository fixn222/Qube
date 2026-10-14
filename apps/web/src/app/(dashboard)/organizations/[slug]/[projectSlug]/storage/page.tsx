import {
  retrieveObjectsFromApi,
  retrieveBucketsFromApi,
} from '@/features/storage/storage-helpers.server';
import { StorageClient } from '@/features/storage/storage-client';

export default async function StoragePage({
  params,
}: {
  params: Promise<{ slug: string; projectSlug: string }>;
}) {
  const { slug, projectSlug } = await params;
  const buckets = await retrieveBucketsFromApi(slug, projectSlug);
  const initialObjects = buckets[0]
    ? await retrieveObjectsFromApi(slug, projectSlug, buckets[0].id)
    : [];

  return (
    <div className="-mx-6 -mt-6 -mb-6 flex h-[calc(100svh-3rem)] min-h-0 flex-col overflow-hidden">
      <StorageClient
        orgSlug={slug}
        projectSlug={projectSlug}
        initialBuckets={buckets}
        initialObjects={initialObjects}
      />
    </div>
  );
}