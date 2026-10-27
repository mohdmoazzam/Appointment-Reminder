import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useToast } from '@/components/toast/use-toast';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader } from '@/components/ui/Card';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Dialog, DialogActions } from '@/components/ui/Dialog';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import { Pagination } from '@/components/ui/Pagination';
import { ErrorBlock, LoadingBlock } from '@/components/ui/QueryStatus';
import { TextField } from '@/components/ui/TextField';
import { countDays, formatDateRange, todayDateOnly } from '@/lib/date';
import type { BusinessClosure } from '@/types/models';
import { useClosures, useCreateClosure, useDeleteClosure, useUpdateClosure } from '../queries';
import {
  closureSchema,
  toClosureFormValues,
  toClosureRequest,
  type ClosureFormValues,
} from '../schemas';

const PAGE_SIZE = 10;

/** What the dialog is showing: closed, a new closure, or an existing one. */
type DialogState = { open: false } | { open: true; closure: BusinessClosure | null };

/** Holidays and other days the whole business is closed. */
export function ClosuresCard({ canEdit }: { canEdit: boolean }) {
  const toast = useToast();
  const [page, setPage] = useState(1);
  const closuresQuery = useClosures({ page, take: PAGE_SIZE, order: 'asc' });
  const deleteMutation = useDeleteClosure();
  const [dialog, setDialog] = useState<DialogState>({ open: false });
  const [closureToDelete, setClosureToDelete] = useState<BusinessClosure | null>(null);

  const confirmDelete = () => {
    if (!closureToDelete) return;
    deleteMutation.mutate(closureToDelete.id, {
      onSuccess: () => {
        toast.success(`${closureToDelete.name} removed`);
        setClosureToDelete(null);
      },
    });
  };

  return (
    <Card>
      <CardHeader
        title="Holidays & closures"
        description="Days the whole business is closed. Nobody can be booked on them."
        actions={
          canEdit && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setDialog({ open: true, closure: null })}
            >
              Add closure
            </Button>
          )
        }
      />

      {closuresQuery.isPending && <LoadingBlock label="Loading closures" />}
      {closuresQuery.isError && (
        <ErrorBlock
          error={closuresQuery.error}
          onRetry={() => void closuresQuery.refetch()}
          isRetrying={closuresQuery.isFetching}
        />
      )}
      {closuresQuery.isSuccess && closuresQuery.data.data.length === 0 && (
        <EmptyState
          title="No upcoming closures"
          description={canEdit ? 'Add public holidays and other days you are closed.' : undefined}
        />
      )}
      {closuresQuery.isSuccess && closuresQuery.data.data.length > 0 && (
        <>
          <ul className="divide-y divide-slate-100">
            {closuresQuery.data.data.map((closure) => (
              <li
                key={closure.id}
                className="flex flex-wrap items-center justify-between gap-3 px-5 py-3"
              >
                <div>
                  <p className="text-sm font-medium text-slate-900">{closure.name}</p>
                  <p className="text-sm text-slate-500">
                    {formatDateRange(closure.starts_on, closure.ends_on)}
                    {countDays(closure.starts_on, closure.ends_on) > 1 &&
                      ` · ${countDays(closure.starts_on, closure.ends_on)} days`}
                  </p>
                </div>
                {canEdit && (
                  <div className="flex gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setDialog({ open: true, closure })}
                    >
                      Edit
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setClosureToDelete(closure)}>
                      Remove
                    </Button>
                  </div>
                )}
              </li>
            ))}
          </ul>
          <Pagination meta={closuresQuery.data.meta} onPageChange={setPage} itemLabel="closures" />
        </>
      )}

      {canEdit && (
        <Dialog
          open={dialog.open}
          onClose={() => setDialog({ open: false })}
          title={dialog.open && dialog.closure ? `Edit ${dialog.closure.name}` : 'Add a closure'}
        >
          <ClosureForm
            closure={dialog.open ? dialog.closure : null}
            onDone={() => setDialog({ open: false })}
          />
        </Dialog>
      )}

      <ConfirmDialog
        open={closureToDelete !== null}
        title={`Remove ${closureToDelete?.name ?? 'closure'}?`}
        message="Those days will be bookable again (within each person's working hours)."
        confirmLabel="Remove"
        tone="danger"
        isPending={deleteMutation.isPending}
        error={deleteMutation.error}
        onConfirm={confirmDelete}
        onCancel={() => {
          setClosureToDelete(null);
          deleteMutation.reset();
        }}
      />
    </Card>
  );
}

interface ClosureFormProps {
  /** The closure to edit, or null to add one. */
  closure: BusinessClosure | null;
  onDone: () => void;
}

function ClosureForm({ closure, onDone }: ClosureFormProps) {
  const toast = useToast();
  const createMutation = useCreateClosure();
  const updateMutation = useUpdateClosure();
  const saveMutation = closure ? updateMutation : createMutation;
  const today = todayDateOnly();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ClosureFormValues>({
    resolver: zodResolver(closureSchema),
    defaultValues: closure
      ? toClosureFormValues(closure)
      : { name: '', starts_on: today, ends_on: today },
  });

  const onSubmit = handleSubmit((values) => {
    const request = toClosureRequest(values);
    const onSuccess = () => {
      toast.success(closure ? 'Closure updated' : 'Closure added');
      onDone();
    };
    if (closure) updateMutation.mutate({ closureId: closure.id, request }, { onSuccess });
    else createMutation.mutate(request, { onSuccess });
  });

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <ErrorAlert error={saveMutation.error} />
      <TextField
        label="Name"
        autoFocus
        placeholder="e.g. Diwali"
        error={errors.name?.message}
        {...register('name')}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          label="First closed day"
          type="date"
          error={errors.starts_on?.message}
          {...register('starts_on')}
        />
        <TextField
          label="Last closed day"
          type="date"
          error={errors.ends_on?.message}
          {...register('ends_on')}
        />
      </div>
      <DialogActions>
        <Button variant="secondary" onClick={onDone} disabled={saveMutation.isPending}>
          Cancel
        </Button>
        <Button type="submit" isLoading={saveMutation.isPending}>
          {closure ? 'Save changes' : 'Add closure'}
        </Button>
      </DialogActions>
    </form>
  );
}
