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
import type { TimeOff } from '@/types/models';
import { useCreateTimeOff, useDeleteTimeOff, useTimeOff } from '../queries';
import { timeOffSchema, toCreateTimeOffRequest, type TimeOffFormValues } from '../schemas';

const PAGE_SIZE = 10;

interface TimeOffCardProps {
  userId: string;
  /** Only owners can add or remove time off. */
  canEdit: boolean;
}

/** Days off for one staff member (leave, sick days), on top of their weekly schedule. */
export function TimeOffCard({ userId, canEdit }: TimeOffCardProps) {
  const toast = useToast();
  const [page, setPage] = useState(1);
  const timeOffQuery = useTimeOff(userId, { page, take: PAGE_SIZE, order: 'asc' });
  const deleteMutation = useDeleteTimeOff(userId);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [timeOffToDelete, setTimeOffToDelete] = useState<TimeOff | null>(null);

  const confirmDelete = () => {
    if (!timeOffToDelete) return;
    deleteMutation.mutate(timeOffToDelete.id, {
      onSuccess: () => {
        toast.success('Time off removed');
        setTimeOffToDelete(null);
      },
    });
  };

  return (
    <Card>
      <CardHeader
        title="Time off"
        description="Upcoming days off. Nobody can book them during these days."
        actions={
          canEdit && (
            <Button variant="secondary" size="sm" onClick={() => setAddDialogOpen(true)}>
              Add time off
            </Button>
          )
        }
      />

      {timeOffQuery.isPending && <LoadingBlock label="Loading time off" />}
      {timeOffQuery.isError && (
        <ErrorBlock
          error={timeOffQuery.error}
          onRetry={() => void timeOffQuery.refetch()}
          isRetrying={timeOffQuery.isFetching}
        />
      )}
      {timeOffQuery.isSuccess && timeOffQuery.data.data.length === 0 && (
        <EmptyState title="No upcoming time off" />
      )}
      {timeOffQuery.isSuccess && timeOffQuery.data.data.length > 0 && (
        <>
          <ul className="divide-y divide-slate-100">
            {timeOffQuery.data.data.map((timeOff) => (
              <li
                key={timeOff.id}
                className="flex flex-wrap items-center justify-between gap-3 px-5 py-3"
              >
                <div>
                  <p className="text-sm font-medium text-slate-900">
                    {formatDateRange(timeOff.starts_on, timeOff.ends_on)}
                  </p>
                  <p className="text-sm text-slate-500">
                    {pluralizeDays(countDays(timeOff.starts_on, timeOff.ends_on))}
                    {timeOff.reason && ` · ${timeOff.reason}`}
                  </p>
                </div>
                {canEdit && (
                  <Button variant="ghost" size="sm" onClick={() => setTimeOffToDelete(timeOff)}>
                    Remove
                  </Button>
                )}
              </li>
            ))}
          </ul>
          <Pagination meta={timeOffQuery.data.meta} onPageChange={setPage} itemLabel="entries" />
        </>
      )}

      {canEdit && (
        <Dialog open={addDialogOpen} onClose={() => setAddDialogOpen(false)} title="Add time off">
          <TimeOffForm userId={userId} onDone={() => setAddDialogOpen(false)} />
        </Dialog>
      )}

      <ConfirmDialog
        open={timeOffToDelete !== null}
        title="Remove this time off?"
        message={
          timeOffToDelete &&
          `${formatDateRange(timeOffToDelete.starts_on, timeOffToDelete.ends_on)} will be bookable again.`
        }
        confirmLabel="Remove"
        tone="danger"
        isPending={deleteMutation.isPending}
        error={deleteMutation.error}
        onConfirm={confirmDelete}
        onCancel={() => {
          setTimeOffToDelete(null);
          deleteMutation.reset();
        }}
      />
    </Card>
  );
}

function TimeOffForm({ userId, onDone }: { userId: string; onDone: () => void }) {
  const toast = useToast();
  const createMutation = useCreateTimeOff(userId);
  const today = todayDateOnly();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<TimeOffFormValues>({
    resolver: zodResolver(timeOffSchema),
    defaultValues: { starts_on: today, ends_on: today, reason: '' },
  });

  const onSubmit = handleSubmit((values) =>
    createMutation.mutate(toCreateTimeOffRequest(values), {
      onSuccess: () => {
        toast.success('Time off added');
        onDone();
      },
    }),
  );

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      {/* 409 (overlaps existing time off) reads well as-is, so all errors show here. */}
      <ErrorAlert error={createMutation.error} />
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          label="First day off"
          type="date"
          error={errors.starts_on?.message}
          {...register('starts_on')}
        />
        <TextField
          label="Last day off"
          type="date"
          error={errors.ends_on?.message}
          {...register('ends_on')}
        />
      </div>
      <TextField
        label="Reason"
        optional
        placeholder="e.g. Annual leave"
        hint="Only visible to your team."
        error={errors.reason?.message}
        {...register('reason')}
      />
      <DialogActions>
        <Button variant="secondary" onClick={onDone} disabled={createMutation.isPending}>
          Cancel
        </Button>
        <Button type="submit" isLoading={createMutation.isPending}>
          Add time off
        </Button>
      </DialogActions>
    </form>
  );
}

function pluralizeDays(days: number): string {
  return days === 1 ? '1 day' : `${days} days`;
}
