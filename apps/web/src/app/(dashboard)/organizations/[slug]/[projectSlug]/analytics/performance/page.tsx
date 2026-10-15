import { ObservatoryPage } from '@/features/observatory/observatory-page';

export default function AnalyticsPerformancePage(props: {
  params: Promise<{ slug: string; projectSlug: string }>;
  searchParams: Promise<{ range?: string }>;
}) {
  return <ObservatoryPage {...props} view="performance" />;
}
