import { ObservatoryPage } from '@/features/observatory/observatory-page';

export default function AnalyticsRealtimePage(props: {
  params: Promise<{ slug: string; projectSlug: string }>;
  searchParams: Promise<{ range?: string }>;
}) {
  return <ObservatoryPage {...props} view="realtime" />;
}
