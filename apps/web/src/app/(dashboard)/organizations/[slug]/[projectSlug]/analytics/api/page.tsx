import { ObservatoryPage } from '@/features/observatory/observatory-page';

export default function ApiAnalyticsPage(props: {
  params: Promise<{ slug: string; projectSlug: string }>;
  searchParams: Promise<{ range?: string }>;
}) {
  return <ObservatoryPage {...props} view="api" />;
}
