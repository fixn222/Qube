import { retrieveObservatorySnapshot } from '@/features/observatory/observatory-helpers.server';

export default async function ProjectSettingsPage({ params }: { params: Promise<{ slug: string; projectSlug: string }> }) {
  const { slug, projectSlug } = await params;
  const snapshot = await retrieveObservatorySnapshot(slug, projectSlug);
  return <main className="mx-auto w-full max-w-5xl space-y-5 p-5 sm:p-8"><header><p className="text-sm text-muted-foreground">Project configuration</p><h1 className="mt-2 text-2xl font-semibold">Project Settings</h1></header><section className="rounded-xl border bg-card p-5"><h2 className="font-medium">Project identity</h2><dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2"><div><dt className="text-muted-foreground">Project identifier</dt><dd className="mt-1 font-mono">{snapshot?.project.id ?? projectSlug}</dd></div><div><dt className="text-muted-foreground">Database schema</dt><dd className="mt-1 font-mono">{snapshot?.project.schema ?? 'Unavailable'}</dd></div><div><dt className="text-muted-foreground">Environment</dt><dd className="mt-1">Not configured in this Qube version</dd></div></dl><p className="mt-5 border-t pt-4 text-sm text-muted-foreground">Project settings are currently read-only. Environment selection and editable project settings are not available yet.</p></section></main>;
}
