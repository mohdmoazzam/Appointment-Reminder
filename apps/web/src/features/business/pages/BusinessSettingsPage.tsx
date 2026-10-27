import { Card } from '@/components/ui/Card';
import { ErrorBlock, LoadingBlock } from '@/components/ui/QueryStatus';
import { PageHeader } from '@/components/ui/PageHeader';
import { useCurrentUser } from '@/features/auth/context/use-auth';
import { ClosuresCard } from '@/features/schedules/components/ClosuresCard';
import { useDocumentTitle } from '@/lib/hooks/use-document-title';
import { BookingLinkCard } from '../components/BookingLinkCard';
import { BusinessLogoCard } from '../components/BusinessLogoCard';
import { BusinessProfileForm } from '../components/BusinessProfileForm';
import { useBusiness } from '../queries';

export function BusinessSettingsPage() {
  useDocumentTitle('Business settings');
  const { isOwner } = useCurrentUser();
  const businessQuery = useBusiness();

  return (
    <>
      <PageHeader
        title="Business settings"
        description="Your business profile, address and logo."
      />

      {businessQuery.isPending && (
        <Card>
          <LoadingBlock label="Loading business" />
        </Card>
      )}

      {businessQuery.isError && (
        <Card>
          <ErrorBlock
            error={businessQuery.error}
            onRetry={() => void businessQuery.refetch()}
            isRetrying={businessQuery.isFetching}
          />
        </Card>
      )}

      {businessQuery.isSuccess && (
        <div className="space-y-6">
          <BookingLinkCard slug={businessQuery.data.slug} />
          <BusinessLogoCard business={businessQuery.data} canEdit={isOwner} />
          {/* The form keeps its own edits; it re-bases on the server's values after each save. */}
          <BusinessProfileForm business={businessQuery.data} canEdit={isOwner} />
          <ClosuresCard canEdit={isOwner} />
        </div>
      )}
    </>
  );
}
