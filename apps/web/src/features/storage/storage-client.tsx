'use client';

import { useState, useCallback, useMemo } from 'react';
import { UploadButton } from '@uploadthing/react';
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@/components/ui/resizable';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  FolderOpen,
  Plus,
  Trash2,
  Copy,
  Check,
  MoreVertical,
  File,
  Lock,
  Globe,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type {
  StorageBucket,
  StorageObject,
  BucketAccess,
} from '@qube/types';
import { OurStorageRouter } from '../../../../api/src/storage/uploadthing';

interface StorageClientProps {
  orgSlug: string;
  projectSlug: string;
  initialBuckets: StorageBucket[];
  initialObjects?: StorageObject[];
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getApiBaseUrl(): string {
  return process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api';
}

export function StorageClient({
  orgSlug,
  projectSlug,
  initialBuckets,
  initialObjects = [],
}: StorageClientProps) {
  const [buckets, setBuckets] = useState<StorageBucket[]>(initialBuckets);
  const [activeBucket, setActiveBucket] = useState<StorageBucket | null>(
    initialBuckets[0] ?? null,
  );
  const [objects, setObjects] = useState<StorageObject[]>(initialObjects);
  const [loadingObjects, setLoadingObjects] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [newBucketName, setNewBucketName] = useState('');
  const [newBucketAccess, setNewBucketAccess] =
    useState<BucketAccess>('public');
  const [creating, setCreating] = useState(false);

  const apiBase = getApiBaseUrl();
  const storageBase = `${apiBase}/orgs/${orgSlug}/projects/${projectSlug}/storage`;
  const apiOrigin = useMemo(() => new URL(apiBase).origin, [apiBase]);

  const uploadFetch = useCallback(
    (input: RequestInfo | URL, init?: RequestInit) => {
      const href =
        typeof input === 'string'
          ? input
          : input instanceof URL
            ? input.href
            : input.url;
      const isOurApi = new URL(href).origin === apiOrigin;
      return fetch(input, {
        ...init,
        credentials: isOurApi ? 'include' : init?.credentials,
      });
    },
    [apiOrigin],
  );

  const uploadUrl = useMemo(() => {
    if (!activeBucket) return '';
    return `${storageBase}/buckets/${activeBucket.id}/upload`;
  }, [storageBase, activeBucket]);

  const loadObjects = useCallback(
    async (bucket: StorageBucket) => {
      setActiveBucket(bucket);
      setLoadingObjects(true);
      try {
        const res = await fetch(`${storageBase}/buckets/${bucket.id}/objects`, {
          credentials: 'include',
        });
        const data = (await res.json()) as StorageObject[];
        setObjects(data);
      } finally {
        setLoadingObjects(false);
      }
    },
    [storageBase],
  );

  const createBucket = async () => {
    if (!newBucketName.trim()) return;
    setCreating(true);
    try {
      const res = await fetch(`${storageBase}/buckets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name: newBucketName, access: newBucketAccess }),
      });
      const bucket = (await res.json()) as StorageBucket;
      setBuckets((prev) => [...prev, bucket]);
      setCreateOpen(false);
      setNewBucketName('');
      void loadObjects(bucket);
    } finally {
      setCreating(false);
    }
  };

  const deleteBucket = async (bucketId: string) => {
    await fetch(`${storageBase}/buckets/${bucketId}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    setBuckets((prev) => prev.filter((b) => b.id !== bucketId));
    if (activeBucket?.id === bucketId) {
      setActiveBucket(null);
      setObjects([]);
    }
  };

  const deleteObject = async (objectId: string) => {
    await fetch(`${storageBase}/objects/${objectId}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    setObjects((prev) => prev.filter((o) => o.id !== objectId));
  };

  const copyUrl = async (object: StorageObject) => {
    let url = object.url;

    if (!url) {
      const res = await fetch(
        `${storageBase}/objects/${object.id}/signed-url`,
        {
          credentials: 'include',
        },
      );
      const data = (await res.json()) as { url: string };
      url = data.url;
    }

    await navigator.clipboard.writeText(url);
    setCopiedId(object.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="flex h-full min-h-0 w-full flex-1 overflow-hidden">
      <div className="flex h-full min-h-0 w-full">
        <ResizablePanelGroup
          orientation="horizontal"
          className="h-full w-full min-h-0"
          defaultLayout={{ 'storage-buckets': 20, 'storage-files': 80 }}
        >
          <ResizablePanel
            id="storage-buckets"
            defaultSize="20"
            minSize="15"
            maxSize="30"
          >
            <div className="flex h-full w-full flex-col overflow-hidden border-r border-border bg-background">
              <div className="flex shrink-0 items-center justify-between border-b border-border px-3 py-2">
                <span className="text-xs font-medium">Buckets</span>

                <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                  <DialogTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-6 w-6">
                      <Plus size={12} />
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Create bucket</DialogTitle>
                    </DialogHeader>
                    <div className="mt-2 space-y-4">
                      <div className="space-y-1">
                        <Label htmlFor="bucket-name">Name</Label>
                        <Input
                          id="bucket-name"
                          value={newBucketName}
                          onChange={(e) => setNewBucketName(e.target.value)}
                          placeholder="my-bucket"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Access</Label>
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            variant={
                              newBucketAccess === 'public'
                                ? 'default'
                                : 'outline'
                            }
                            size="sm"
                            className="gap-1.5"
                            onClick={() => setNewBucketAccess('public')}
                          >
                            <Globe size={12} />
                            Public
                          </Button>
                          <Button
                            type="button"
                            variant={
                              newBucketAccess === 'private'
                                ? 'default'
                                : 'outline'
                            }
                            size="sm"
                            className="gap-1.5"
                            onClick={() => setNewBucketAccess('private')}
                          >
                            <Lock size={12} />
                            Private
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {newBucketAccess === 'public'
                            ? 'Files are accessible via their URL without authentication'
                            : 'Files require a signed URL to access'}
                        </p>
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          onClick={() => setCreateOpen(false)}
                        >
                          Cancel
                        </Button>
                        <Button
                          onClick={() => void createBucket()}
                          disabled={creating}
                        >
                          {creating ? 'Creating...' : 'Create'}
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto py-1">
                {buckets.length === 0 ? (
                  <p className="px-3 py-6 text-center text-xs text-muted-foreground">
                    No buckets yet
                  </p>
                ) : (
                  buckets.map((bucket) => (
                    <div
                      key={bucket.id}
                      className={cn(
                        'flex cursor-pointer items-center justify-between px-3 py-2',
                        activeBucket?.id === bucket.id
                          ? 'bg-accent text-accent-foreground'
                          : 'hover:bg-accent/50',
                      )}
                      onClick={() => void loadObjects(bucket)}
                    >
                      <div className="flex min-w-0 items-center gap-2">
                        <FolderOpen
                          size={14}
                          className="shrink-0 text-muted-foreground"
                        />
                        <span className="truncate text-sm">{bucket.name}</span>
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        {bucket.access === 'private' ? (
                          <Lock size={10} className="text-muted-foreground" />
                        ) : (
                          <Globe size={10} className="text-muted-foreground" />
                        )}
                        {activeBucket?.id === bucket.id && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-5 w-5"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <MoreVertical size={10} />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                className="text-destructive"
                                onSelect={() => void deleteBucket(bucket.id)}
                              >
                                <Trash2 size={12} className="mr-1.5" />
                                Delete bucket
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </ResizablePanel>

          <ResizableHandle withHandle />

          <ResizablePanel
            id="storage-files"
            defaultSize="80"
            minSize="50"
          >
            <div className="flex h-full w-full min-h-0 flex-col overflow-hidden">
              {activeBucket && (
                <div className="flex shrink-0 items-center justify-between border-b border-border px-4 py-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">
                      {activeBucket.name}
                    </span>
                    <Badge
                      variant="secondary"
                      className="gap-1 text-xs capitalize"
                    >
                      {activeBucket.access === 'private' ? (
                        <>
                          <Lock size={10} /> Private
                        </>
                      ) : (
                        <>
                          <Globe size={10} /> Public
                        </>
                      )}
                    </Badge>
                  </div>

                  {uploadUrl && activeBucket ? (
                    <UploadButton<OurStorageRouter, 'bucketUploader'>
                      url={uploadUrl}
                      endpoint="bucketUploader"
                      fetch={uploadFetch}
                      onUploadError={(error) => {
                        console.error('Upload failed:', error.message);
                      }}
                      onClientUploadComplete={async (files) => {
                        for (const file of files) {
                          const res = await fetch(
                            `${storageBase}/buckets/${activeBucket.id}/objects`,
                            {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              credentials: 'include',
                              body: JSON.stringify({
                                name: file.name,
                                size: file.size,
                                type: file.type ?? 'application/octet-stream',
                                utKey: file.key,
                                url: file.url,
                              }),
                            },
                          );
                          if (!res.ok) {
                            console.error(
                              'Failed to save file:',
                              await res.text(),
                            );
                            continue;
                          }
                          const object = (await res.json()) as StorageObject;
                          setObjects((prev) => [object, ...prev]);
                        }
                      }}
                      appearance={{
                        button:
                          'ut-ready:bg-primary ut-ready:text-primary-foreground h-8 px-3 text-sm rounded-md',
                        allowedContent: 'hidden',
                      }}
                    />
                  ) : null}
                </div>
              )}

              {!activeBucket ? (
                <div className="flex flex-1 flex-col items-center justify-center text-center">
                  <FolderOpen
                    size={32}
                    className="mb-3 text-muted-foreground"
                  />
                  <p className="text-sm text-muted-foreground">
                    Select a bucket to browse files
                  </p>
                </div>
              ) : loadingObjects ? (
                <div className="flex flex-1 items-center justify-center">
                  <p className="text-sm text-muted-foreground">Loading...</p>
                </div>
              ) : objects.length === 0 ? (
                <div className="flex flex-1 flex-col items-center justify-center text-center">
                  <p className="text-sm text-muted-foreground">
                    This bucket is empty
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Upload files using the button above
                  </p>
                </div>
              ) : (
                <div className="min-h-0 w-full flex-1 overflow-y-auto">
                  <div className="grid w-full grid-cols-2 gap-3 p-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                    {objects.map((object) => (
                      <div
                        key={object.id}
                        className="group relative rounded-xl border border-border p-3 transition-colors hover:bg-accent"
                      >
                        <div className="mb-2 flex h-16 items-center justify-center">
                          {object.mimeType.startsWith('image/') &&
                          object.url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={object.url}
                              alt={object.name}
                              className="max-h-16 max-w-full rounded object-contain"
                            />
                          ) : (
                            <File
                              size={32}
                              className="text-muted-foreground"
                            />
                          )}
                        </div>

                        <p className="truncate text-xs font-medium">
                          {object.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatBytes(object.size)}
                        </p>

                        <div className="absolute top-2 right-2 hidden gap-1 group-hover:flex">
                          <Button
                            variant="secondary"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => void copyUrl(object)}
                            title="Copy URL"
                          >
                            {copiedId === object.id ? (
                              <Check size={10} />
                            ) : (
                              <Copy size={10} />
                            )}
                          </Button>
                          <Button
                            variant="secondary"
                            size="icon"
                            className="h-6 w-6 hover:text-destructive"
                            onClick={() => void deleteObject(object.id)}
                            title="Delete"
                          >
                            <Trash2 size={10} />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </div>
  );
}