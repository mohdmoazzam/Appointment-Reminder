import { useSearchParams } from 'react-router';
import { ErrorBlock, LoadingBlock } from '@/components/ui/QueryStatus';
import { Tabs } from '@/components/ui/Tabs';
import { tabId, tabPanelId } from '@/components/ui/tab-ids';
import { useCurrentUser } from '@/features/auth/context/use-auth';
import { ClosuresCard } from '@/features/schedules/components/ClosuresCard';
import { useDocumentTitle } from '@/lib/hooks/use-document-title';
import { BookingPagePanel } from '../components/BookingPagePanel';
import { BusinessIdentityHeader } from '../components/BusinessIdentityHeader';
import { BusinessProfileForm } from '../components/BusinessProfileForm';
import { useBusiness } from '../queries';

type SettingsTab = 'profile' | 'booking' | 'closures';

const TABS: { id: SettingsTab; label: string }[] = [
  { id: 'profile', label: 'Profile' },
  { id: 'booking', label: 'Online booking' },
  { id: 'closures', label: 'Holidays & closures' },
];

export function BusinessSettingsPage() {
  useDocumentTitle('Business settings');
  const { isOwner } = useCurrentUser();
  const businessQuery = useBusiness();

  // The open tab lives in the URL (?tab=booking) so a refresh or a shared link keeps it.
  const [searchParams, setSearchParams] = useSearchParams();
  const requested = searchParams.get('tab');
  const tab: SettingsTab = TABS.some((item) => item.id === requested) ? (requested as SettingsTab) : 'profile';
  const selectTab = (next: SettingsTab) => setSearchParams(next === 'profile' ? {} : { tab: next }, { replace: true });

  if (businessQuery.isPending) return <LoadingBlock label="Loading business" />;
  if (businessQuery.isError) {
    return <ErrorBlock error={businessQuery.error} onRetry={() => void businessQuery.refetch()} isRetrying={businessQuery.isFetching} />;
  }

  const business = businessQuery.data;

  return (
    <>
      <BusinessIdentityHeader business={business} canEdit={isOwner} />
      <Tabs label="Business settings" className="mb-8" tabs={TABS} value={tab} onChange={selectTab} />

      <div role="tabpanel" id={tabPanelId(tab)} aria-labelledby={tabId(tab)}>
        {/* The form keeps its own edits; it re-bases on the server's values after each save. */}
        {tab === 'profile' && <BusinessProfileForm business={business} canEdit={isOwner} />}
        {tab === 'booking' && <BookingPagePanel slug={business.slug} />}
        {tab === 'closures' && <ClosuresCard canEdit={isOwner} />}
      </div>
    </>
  );
}
