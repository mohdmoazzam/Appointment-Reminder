import { useState } from 'react';
import { useToast } from '@/components/toast/use-toast';
import { Button } from '@/components/ui/Button';
import { DayStrip } from '@/components/ui/DayStrip';
import { controlStyles } from '@/components/ui/field-styles';
import { Pagination } from '@/components/ui/Pagination';
import { ErrorBlock, LoadingBlock } from '@/components/ui/QueryStatus';
import { useCurrentUser } from '@/features/auth/context/use-auth';
import { useStaffMembers } from '@/features/staff/queries';
import { cn } from '@/lib/cn';
import { formatLongDate, todayInTimeZone } from '@/lib/date';
import { useDocumentTitle } from '@/lib/hooks/use-document-title';
import { fullName } from '@/lib/names';
import { APPOINTMENT_STATUS_LABELS } from '@/types/enums';
import type { Appointment } from '@/types/models';
import { AppointmentRow, type DirectStatusChange } from '../components/AppointmentRow';
import { CancelAppointmentDialog } from '../components/CancelAppointmentDialog';
import { NewAppointmentDialog } from '../components/NewAppointmentDialog';
import { RescheduleDialog } from '../components/RescheduleDialog';
import { useAppointments, useUpdateAppointmentStatus } from '../queries';

/** Generous page size: a busy day fits on one page; more spills onto the next. */
const PAGE_SIZE = 50;
const ALL_STAFF = { page: 1, take: 100, order: 'asc' } as const;

/** One day's appointments, in the business's time zone. */
export function AppointmentsPage() {
  useDocumentTitle('Appointments');
  const toast = useToast();
  const { business } = useCurrentUser();
  const timeZone = business.timezone;
  const today = todayInTimeZone(timeZone);

  const [date, setDate] = useState(today);
  const [staffId, setStaffId] = useState('');
  const [showCancelled, setShowCancelled] = useState(false);
  const [page, setPage] = useState(1);

  const appointmentsQuery = useAppointments({
    date_from: date,
    date_to: date,
    staff_id: staffId || undefined,
    exclude_cancelled: !showCancelled,
    order: 'asc',
    page,
    take: PAGE_SIZE,
  });
  const staffQuery = useStaffMembers(ALL_STAFF);

  const [newDialogOpen, setNewDialogOpen] = useState(false);
  const [toReschedule, setToReschedule] = useState<Appointment | null>(null);
  const [toCancel, setToCancel] = useState<Appointment | null>(null);
  const statusMutation = useUpdateAppointmentStatus();

  /** Any filter change starts again from the first page. */
  const changeFilter = (apply: () => void) => {
    apply();
    setPage(1);
  };

  const changeStatus = (appointment: Appointment, status: DirectStatusChange) =>
    statusMutation.mutate(
      { appointmentId: appointment.id, request: { status } },
      {
        onSuccess: () =>
          toast.success(`${fullName(appointment.customer)} · ${APPOINTMENT_STATUS_LABELS[status]}`),
        onError: (error) => toast.error(error),
      },
    );

  const appointments = appointmentsQuery.data?.data ?? [];
  const total = appointmentsQuery.data?.meta.count ?? 0;

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Appointments</h1>
          <p className="mt-1 text-sm text-slate-500">
            {formatLongDate(date)}
            {date === today && ' · Today'}
          </p>
        </div>
        <Button onClick={() => setNewDialogOpen(true)}>
          <svg viewBox="0 0 20 20" fill="currentColor" className="size-4" aria-hidden="true">
            <path d="M10 4a.75.75 0 0 1 .75.75v4.5h4.5a.75.75 0 0 1 0 1.5h-4.5v4.5a.75.75 0 0 1-1.5 0v-4.5h-4.5a.75.75 0 0 1 0-1.5h4.5v-4.5A.75.75 0 0 1 10 4Z" />
          </svg>
          New appointment
        </Button>
      </div>

      <div className="mb-6 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <DayStrip
          value={date}
          onChange={(next) => changeFilter(() => setDate(next))}
          today={today}
        />
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
          <select
            aria-label="Filter by staff member"
            value={staffId}
            onChange={(event) => changeFilter(() => setStaffId(event.target.value))}
            className={cn(controlStyles(false), 'w-auto min-w-44 py-1.5')}
          >
            <option value="">All staff</option>
            {(staffQuery.data?.data ?? []).map((member) => (
              <option key={member.id} value={member.id}>
                {fullName(member)}
              </option>
            ))}
          </select>
          <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={showCancelled}
              onChange={(event) => changeFilter(() => setShowCancelled(event.target.checked))}
              className="size-4 rounded border-slate-300 accent-brand-600"
            />
            Show cancelled
          </label>
        </div>
      </div>

      {appointmentsQuery.isPending && <LoadingBlock label="Loading appointments" />}
      {appointmentsQuery.isError && (
        <ErrorBlock
          error={appointmentsQuery.error}
          onRetry={() => void appointmentsQuery.refetch()}
          isRetrying={appointmentsQuery.isFetching}
        />
      )}

      {appointmentsQuery.isSuccess && total === 0 && (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
          <div className="mx-auto mb-3 inline-flex size-12 items-center justify-center rounded-full bg-brand-50 text-brand-600">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.75}
              className="size-6"
              aria-hidden="true"
            >
              <rect x="3" y="5" width="18" height="16" rx="2" />
              <path d="M3 10h18M8 3v4M16 3v4" strokeLinecap="round" />
            </svg>
          </div>
          <p className="font-medium text-slate-900">
            {date === today ? 'Nothing booked for today' : 'Nothing booked for this day'}
          </p>
          <p className="mt-1 text-sm text-slate-500">
            New bookings from your team and your booking page show up here.
          </p>
          <Button
            variant="secondary"
            size="sm"
            className="mt-5"
            onClick={() => setNewDialogOpen(true)}
          >
            Book an appointment
          </Button>
        </div>
      )}

      {appointmentsQuery.isSuccess && total > 0 && (
        <>
          <DaySummary appointments={appointments} total={total} />
          <ul className="space-y-3">
            {appointments.map((appointment) => (
              <AppointmentRow
                key={appointment.id}
                appointment={appointment}
                timeZone={timeZone}
                currency={business.currency}
                onChangeStatus={changeStatus}
                onReschedule={setToReschedule}
                onCancel={setToCancel}
                isUpdating={
                  statusMutation.isPending &&
                  statusMutation.variables?.appointmentId === appointment.id
                }
              />
            ))}
          </ul>
          {appointmentsQuery.data.meta.pageCount > 1 && (
            <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white">
              <Pagination
                meta={appointmentsQuery.data.meta}
                onPageChange={setPage}
                itemLabel="appointments"
              />
            </div>
          )}
        </>
      )}

      <NewAppointmentDialog
        open={newDialogOpen}
        onClose={() => setNewDialogOpen(false)}
        date={date}
        today={today}
        timeZone={timeZone}
        currency={business.currency}
      />
      <RescheduleDialog
        appointment={toReschedule}
        onClose={() => setToReschedule(null)}
        today={today}
        timeZone={timeZone}
      />
      <CancelAppointmentDialog
        appointment={toCancel}
        onClose={() => setToCancel(null)}
        timeZone={timeZone}
      />
    </>
  );
}

/**
 * "6 appointments · 2 confirmed · 1 online". The breakdown is only shown when the whole day is
 * on this page; otherwise it would describe a part of the day as if it were all of it.
 */
function DaySummary({ appointments, total }: { appointments: Appointment[]; total: number }) {
  const parts = [`${total} ${total === 1 ? 'appointment' : 'appointments'}`];
  if (appointments.length === total) {
    const confirmed = appointments.filter(
      (appointment) => appointment.status === 'confirmed',
    ).length;
    const online = appointments.filter((appointment) => appointment.source === 'online').length;
    if (confirmed > 0) parts.push(`${confirmed} confirmed`);
    if (online > 0) parts.push(`${online} online`);
  }
  return <p className="mb-3 text-sm font-medium text-slate-600">{parts.join(' · ')}</p>;
}
