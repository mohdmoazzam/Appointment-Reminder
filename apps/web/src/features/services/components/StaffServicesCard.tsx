import { useState } from 'react';
import { paths } from '@/app/paths';
import { useToast } from '@/components/toast/use-toast';
import { Button } from '@/components/ui/Button';
import { ButtonLink } from '@/components/ui/ButtonLink';
import { Card, CardBody, CardFooter, CardHeader } from '@/components/ui/Card';
import { CheckboxList, type CheckboxListOption } from '@/components/ui/CheckboxList';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import { ErrorBlock, LoadingBlock } from '@/components/ui/QueryStatus';
import { formatDuration } from '@/lib/durations';
import { formatPrice } from '@/lib/money';
import type { Service } from '@/types/models';
import { useAllServices, useSetStaffServices, useStaffServiceIds } from '../queries';

interface StaffServicesCardProps {
  userId: string;
  currency: string;
  /** Only owners can change who offers what. */
  canEdit: boolean;
}

/** Which services one staff member offers. */
export function StaffServicesCard({ userId, currency, canEdit }: StaffServicesCardProps) {
  const servicesQuery = useAllServices();
  const offeredQuery = useStaffServiceIds(userId);

  const isPending = servicesQuery.isPending || offeredQuery.isPending;
  const error = servicesQuery.error ?? offeredQuery.error;
  const retry = () => {
    void servicesQuery.refetch();
    void offeredQuery.refetch();
  };

  return (
    <Card>
      <CardHeader
        title="Services offered"
        description="Customers can book this person for these services."
      />
      {isPending && <LoadingBlock label="Loading services" />}
      {!isPending && error && (
        <ErrorBlock
          error={error}
          onRetry={retry}
          isRetrying={servicesQuery.isFetching || offeredQuery.isFetching}
        />
      )}
      {servicesQuery.isSuccess && offeredQuery.isSuccess && (
        <ServicesPicker
          // Remount with fresh selections when the saved list changes (e.g. edited from the Services page).
          key={offeredQuery.data.join(',')}
          userId={userId}
          services={servicesQuery.data.data}
          offeredIds={offeredQuery.data}
          currency={currency}
          canEdit={canEdit}
        />
      )}
    </Card>
  );
}

interface ServicesPickerProps {
  userId: string;
  services: Service[];
  offeredIds: string[];
  currency: string;
  canEdit: boolean;
}

function ServicesPicker({ userId, services, offeredIds, currency, canEdit }: ServicesPickerProps) {
  const toast = useToast();
  const [selectedIds, setSelectedIds] = useState<string[]>(offeredIds);
  const saveMutation = useSetStaffServices(userId);

  if (services.length === 0) {
    return (
      <EmptyState
        title="No services yet"
        description="Add your services first, then choose who offers them."
        action={
          canEdit && (
            <ButtonLink to={paths.services} variant="secondary" size="sm">
              Go to services
            </ButtonLink>
          )
        }
      />
    );
  }

  const isDirty = !sameIds(selectedIds, offeredIds);
  // Inactive services are only listed when already offered, so they can be unticked.
  const options: CheckboxListOption[] = services
    .filter((service) => service.is_active || offeredIds.includes(service.id))
    .map((service) => ({
      value: service.id,
      label: service.name,
      description: [
        formatDuration(service.duration_minutes),
        formatPrice(service.price, currency),
        service.is_active ? null : 'Inactive',
      ]
        .filter(Boolean)
        .join(' · '),
    }));

  const save = () =>
    saveMutation.mutate(selectedIds, { onSuccess: () => toast.success('Services updated') });

  return (
    <>
      <CardBody className="space-y-4">
        <ErrorAlert error={saveMutation.error} />
        <CheckboxList
          legend="Services"
          options={options}
          value={selectedIds}
          onChange={setSelectedIds}
          disabled={!canEdit}
        />
      </CardBody>
      {canEdit && (
        <CardFooter>
          <Button
            variant="secondary"
            disabled={!isDirty || saveMutation.isPending}
            onClick={() => setSelectedIds(offeredIds)}
          >
            Discard changes
          </Button>
          <Button onClick={save} disabled={!isDirty} isLoading={saveMutation.isPending}>
            Save services
          </Button>
        </CardFooter>
      )}
    </>
  );
}

function sameIds(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((id) => b.includes(id));
}
