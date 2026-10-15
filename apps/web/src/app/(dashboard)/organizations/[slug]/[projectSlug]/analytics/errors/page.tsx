import { ObservatoryPage } from '@/features/observatory/observatory-page';

export default function AnalyticsErrorsPage(props: {
  params: Promise<{ slug: string; projectSlug: string }>;
  searchParams: Promise<{ range?: string }>;
}) {
  return <ObservatoryPage {...props} view="errors" />;
}
