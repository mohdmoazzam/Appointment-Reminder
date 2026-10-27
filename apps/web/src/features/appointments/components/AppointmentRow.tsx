import { ActionMenu, type ActionMenuItem } from '@/components/ui/ActionMenu';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/cn';
import { formatTimeInZone } from '@/lib/date';
import { formatPrice } from '@/lib/money';
import { fullName } from '@/lib/names';
import type { AppointmentStatus } from '@/types/enums';
import type { Appointment } from '@/types/models';
import { STATUS_ACTION_LABELS, availableStatusChanges, canReschedule } from '../status';
import type { SettableStatus } from '../types';
import { AppointmentStatusBadge } from './AppointmentStatusBadge';

/** Status changes other than cancelling (cancelling asks for a reason first). */
export type DirectStatusChange = Exclude<SettableStatus, 'cancelled'>;

/** Colour of the bar on the left of each appointment. */
const STATUS_ACCENTS: Record<AppointmentStatus, string> = {
  booked: 'bg-brand-500',
  confirmed: 'bg-emerald-500',
  completed: 'bg-slate-300',
  cancelled: 'bg-red-300',
  no_show: 'bg-amber-400',
};

interface AppointmentRowProps {
  appointment: Appointment;
  timeZone: string;
  currency: string;
  onChangeStatus: (appointment: Appointment, status: DirectStatusChange) => void;
  onReschedule: (appointment: Appointment) => void;
  onCancel: (appointment: Appointment) => void;
  /** True while this appointment's status change is being saved. */
  isUpdating: boolean;
}

/**
 * One appointment: time, customer, service. Shows the single most likely next step as a
 * button (Confirm before it starts, Complete after) and everything else in the "⋯" menu.
 */
export function AppointmentRow({
  appointment,
  timeZone,
  currency,
  onChangeStatus,
  onReschedule,
  onCancel,
  isUpdating,
}: AppointmentRowProps) {
  const changes = availableStatusChanges(appointment);
  const primary = primaryAction(changes);
  const customerName = fullName(appointment.customer);
  const staffName = fullName(appointment.staff);
  const faded = appointment.status === 'cancelled' || appointment.status === 'no_show';

  const menuItems: ActionMenuItem[] = [
    ...(canReschedule(appointment)
      ? [{ label: 'Reschedule', onSelect: () => onReschedule(appointment) }]
      : []),
    ...changes
      .filter(
        (status): status is DirectStatusChange => status !== 'cancelled' && status !== primary,
      )
      .map((status) => ({
        label: STATUS_ACTION_LABELS[status],
        onSelect: () => onChangeStatus(appointment, status),
      })),
    ...(changes.includes('cancelled')
      ? [{ label: 'Cancel appointment', danger: true, onSelect: () => onCancel(appointment) }]
      : []),
  ];

  return (
    <li className="group relative flex gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md">
      <span
        aria-hidden="true"
        className={cn(
          'absolute inset-y-3 left-0 w-1 rounded-r-full',
          STATUS_ACCENTS[appointment.status],
        )}
      />

      <div className={cn('w-20 shrink-0 pl-1', faded && 'opacity-60')}>
        <p className="text-sm font-semibold text-slate-900">
          {formatTimeInZone(appointment.starts_at, timeZone)}
        </p>
        <p className="text-xs text-slate-500">{formatTimeInZone(appointment.ends_at, timeZone)}</p>
      </div>

      <div className={cn('min-w-0 flex-1 space-y-1', faded && 'opacity-60')}>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <p
            className={cn(
              'truncate font-medium text-slate-900',
              appointment.status === 'cancelled' && 'line-through decoration-slate-400',
            )}
          >
            {customerName}
          </p>
          <AppointmentStatusBadge status={appointment.status} />
          {appointment.source === 'online' && (
            <span className="text-xs font-medium text-slate-500">· Online</span>
          )}
        </div>
        <p className="truncate text-sm text-slate-600">
          {appointment.service.name} · {formatPrice(appointment.price, currency)}
        </p>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
          <span className="inline-flex items-center gap-1.5">
            <Avatar name={staffName} size="sm" />
            {staffName}
          </span>
          <a
            href={`tel:${appointment.customer.phone}`}
            className="hover:text-slate-700 hover:underline"
          >
            {appointment.customer.phone}
          </a>
        </div>
        {appointment.notes && (
          <p className="text-xs text-slate-500 italic">“{appointment.notes}”</p>
        )}
        {appointment.status === 'cancelled' && appointment.cancellation_reason && (
          <p className="text-xs text-red-600">Cancelled: {appointment.cancellation_reason}</p>
        )}
      </div>

      <div className="flex shrink-0 items-start gap-1">
        {primary && (
          <Button
            size="sm"
            variant="secondary"
            isLoading={isUpdating}
            onClick={() => onChangeStatus(appointment, primary)}
          >
            {primary === 'confirmed' ? 'Confirm' : 'Complete'}
          </Button>
        )}
        <ActionMenu
          items={menuItems}
          label={`More actions for ${customerName}`}
          disabled={isUpdating}
        />
      </div>
    </li>
  );
}

/**
 * The one button shown: Complete once the visit has started (only then is it offered),
 * otherwise Confirm. Nothing for final states.
 */
function primaryAction(changes: SettableStatus[]): DirectStatusChange | null {
  if (changes.includes('completed')) return 'completed';
  if (changes.includes('confirmed')) return 'confirmed';
  return null;
}
