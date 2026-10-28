import { Link } from 'react-router';
import { paths } from '@/app/paths';
import { CalendarIcon, ChevronRightIcon } from '@/components/layout/icons';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader } from '@/components/ui/Card';
import { ErrorBlock, LoadingBlock } from '@/components/ui/QueryStatus';
import { AppointmentStatusBadge } from '@/features/appointments/components/AppointmentStatusBadge';
import { canReschedule } from '@/features/appointments/status';
import { cn } from '@/lib/cn';
import { formatRelative, formatTimeInZone, isPast } from '@/lib/date';
import { fullName } from '@/lib/names';
import type { Appointment } from '@/types/models';

/** Rows shown before "View all"; the full day lives on the Appointments page. */
const MAX_ROWS = 6;

interface TodayScheduleProps {
  appointments: Appointment[];
  /** Today's total, which can be more than the rows loaded. */
  total: number;
  isPending: boolean;
  error: unknown;
  onRetry: () => void;
  isRetrying: boolean;
  timeZone: string;
  onBook: () => void;
}

/** Today's appointments in time order, with the next one to come highlighted. */
export function TodaySchedule({
  appointments,
  total,
  isPending,
  error,
  onRetry,
  isRetrying,
  timeZone,
  onBook,
}: TodayScheduleProps) {
  const upNext = appointments.find(
    (appointment) => canReschedule(appointment) && !isPast(appointment.ends_at),
  );
  const rows = appointments.slice(0, MAX_ROWS);

  return (
    <Card className="overflow-hidden">
      <CardHeader
        title="Today's schedule"
        description={
          isPending || error ? undefined : total === 0 ? 'Nothing booked yet' : plural(total)
        }
        actions={
          total > 0 && (
            <Link
              to={paths.appointments}
              className="inline-flex items-center gap-1 text-sm font-medium text-brand-600 hover:text-brand-700"
            >
              View all
              <ChevronRightIcon className="size-4" />
            </Link>
          )
        }
      />

      {isPending ? (
        <LoadingBlock label="Loading today's appointments" />
      ) : error ? (
        <ErrorBlock error={error} onRetry={onRetry} isRetrying={isRetrying} />
      ) : total === 0 ? (
        <div className="px-6 py-12 text-center">
          <div className="mx-auto mb-3 inline-flex size-11 items-center justify-center rounded-full bg-brand-50 text-brand-600">
            <CalendarIcon className="size-5" />
          </div>
          <p className="font-medium text-slate-900">A free day so far</p>
          <p className="mt-1 text-sm text-slate-500">
            Bookings from your team and your booking page will show up here.
          </p>
          <Button variant="secondary" size="sm" className="mt-5" onClick={onBook}>
            Book an appointment
          </Button>
        </div>
      ) : (
        <>
          <ul className="divide-y divide-slate-100">
            {rows.map((appointment) => (
              <ScheduleRow
                key={appointment.id}
                appointment={appointment}
                timeZone={timeZone}
                isNext={appointment.id === upNext?.id}
              />
            ))}
          </ul>
          {total > rows.length && (
            <Link
              to={paths.appointments}
              className="block border-t border-slate-100 bg-slate-50 px-5 py-3 text-center text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            >
              {total - rows.length} more today
            </Link>
          )}
        </>
      )}
    </Card>
  );
}

interface ScheduleRowProps {
  appointment: Appointment;
  timeZone: string;
  isNext: boolean;
}

function ScheduleRow({ appointment, timeZone, isNext }: ScheduleRowProps) {
  const isOver = isPast(appointment.ends_at);
  const isNow = !isOver && isPast(appointment.starts_at);

  return (
    <li>
      <Link
        to={paths.appointments}
        className={cn(
          'flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-slate-50',
          isNext && 'bg-brand-50/60 hover:bg-brand-50',
        )}
      >
        <div className={cn('w-16 shrink-0', isOver && 'opacity-50')}>
          <p className="text-sm font-semibold text-slate-900 tabular-nums">
            {formatTimeInZone(appointment.starts_at, timeZone)}
          </p>
          <p className="text-xs text-slate-500 tabular-nums">
            {appointment.service.duration_minutes} min
          </p>
        </div>

        <div className={cn('min-w-0 flex-1', isOver && 'opacity-50')}>
          <p className="truncate text-sm font-medium text-slate-900">
            {fullName(appointment.customer)}
          </p>
          <p className="truncate text-sm text-slate-500">
            {appointment.service.name}
            <span className="hidden sm:inline"> · {fullName(appointment.staff)}</span>
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-3">
          {isNext && (
            <span className="hidden text-xs font-medium text-brand-700 sm:inline">
              {isNow ? 'In progress' : `Up next · ${formatRelative(appointment.starts_at)}`}
            </span>
          )}
          <AppointmentStatusBadge status={appointment.status} />
        </div>
      </Link>
    </li>
  );
}

function plural(count: number): string {
  return `${count} ${count === 1 ? 'appointment' : 'appointments'}`;
}
