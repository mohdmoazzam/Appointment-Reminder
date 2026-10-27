import { useState } from 'react';
import { useToast } from '@/components/toast/use-toast';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageHeader } from '@/components/ui/PageHeader';
import { Pagination } from '@/components/ui/Pagination';
import { ErrorBlock, LoadingBlock } from '@/components/ui/QueryStatus';
import { useCurrentUser } from '@/features/auth/context/use-auth';
import { cn } from '@/lib/cn';
import { useDocumentTitle } from '@/lib/hooks/use-document-title';
import type { Service } from '@/types/models';
import { ServiceFormDialog } from '../components/ServiceFormDialog';
import { ServicesTable } from '../components/ServicesTable';
import { useDeleteService, useServices } from '../queries';

const PAGE_SIZE = 20;

type StatusFilter = 'all' | 'active' | 'inactive';

const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
];

/** What the dialog is showing: closed, a new service, or an existing one. */
type DialogState = { open: false } | { open: true; service: Service | null };

export function ServicesPage() {
  useDocumentTitle('Services');
  const toast = useToast();
  const { business, isOwner } = useCurrentUser();

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [page, setPage] = useState(1);
  const servicesQuery = useServices({
    page,
    take: PAGE_SIZE,
    order: 'asc',
    is_active: statusFilter === 'all' ? undefined : statusFilter === 'active',
  });

  const [dialog, setDialog] = useState<DialogState>({ open: false });
  const [serviceToDelete, setServiceToDelete] = useState<Service | null>(null);
  const deleteMutation = useDeleteService();

  const changeFilter = (filter: StatusFilter) => {
    setStatusFilter(filter);
    setPage(1);
  };

  const confirmDelete = () => {
    if (!serviceToDelete) return;
    deleteMutation.mutate(serviceToDelete.id, {
      onSuccess: () => {
        toast.success(`${serviceToDelete.name} deleted`);
        setServiceToDelete(null);
      },
    });
  };

  return (
    <>
      <PageHeader
        title="Services"
        description="What customers can book, how long it takes and what it costs."
        actions={
          isOwner && (
            <Button onClick={() => setDialog({ open: true, service: null })}>Add service</Button>
          )
        }
      />

      <Card>
        <div
          role="tablist"
          aria-label="Filter by status"
          className="flex gap-1 border-b border-slate-200 px-3 pt-3"
        >
          {STATUS_FILTERS.map((filter) => (
            <button
              key={filter.value}
              type="button"
              role="tab"
              aria-selected={statusFilter === filter.value}
              onClick={() => changeFilter(filter.value)}
              className={cn(
                '-mb-px border-b-2 px-3 py-2 text-sm font-medium',
                statusFilter === filter.value
                  ? 'border-brand-600 text-brand-700'
                  : 'border-transparent text-slate-500 hover:text-slate-700',
              )}
            >
              {filter.label}
            </button>
          ))}
        </div>

        {servicesQuery.isPending && <LoadingBlock label="Loading services" />}
        {servicesQuery.isError && (
          <ErrorBlock
            error={servicesQuery.error}
            onRetry={() => void servicesQuery.refetch()}
            isRetrying={servicesQuery.isFetching}
          />
        )}

        {servicesQuery.isSuccess && servicesQuery.data.data.length === 0 && (
          <EmptyState
            title={statusFilter === 'all' ? 'No services yet' : `No ${statusFilter} services`}
            description={
              statusFilter === 'all' && isOwner
                ? 'Add the services you offer, e.g. "Haircut – 30 min".'
                : undefined
            }
            action={
              statusFilter === 'all' &&
              isOwner && (
                <Button onClick={() => setDialog({ open: true, service: null })}>
                  Add service
                </Button>
              )
            }
          />
        )}

        {servicesQuery.isSuccess && servicesQuery.data.data.length > 0 && (
          <>
            <ServicesTable
              services={servicesQuery.data.data}
              currency={business.currency}
              canManage={isOwner}
              onEdit={(service) => setDialog({ open: true, service })}
              onDelete={setServiceToDelete}
            />
            <Pagination
              meta={servicesQuery.data.meta}
              onPageChange={setPage}
              itemLabel="services"
            />
          </>
        )}
      </Card>

      {isOwner && (
        <ServiceFormDialog
          open={dialog.open}
          service={dialog.open ? dialog.service : null}
          currency={business.currency}
          onClose={() => setDialog({ open: false })}
        />
      )}

      <ConfirmDialog
        open={serviceToDelete !== null}
        title={`Delete ${serviceToDelete?.name ?? 'service'}?`}
        message="It will be removed for good. To hide it from booking but keep it, edit it and untick Active instead."
        confirmLabel="Delete service"
        tone="danger"
        isPending={deleteMutation.isPending}
        error={deleteMutation.error}
        onConfirm={confirmDelete}
        onCancel={() => {
          setServiceToDelete(null);
          deleteMutation.reset();
        }}
      />
    </>
  );
}
