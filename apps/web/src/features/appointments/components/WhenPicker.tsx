import type { UseFormRegisterReturn } from 'react-hook-form';
import { DayStrip } from '@/components/ui/DayStrip';
import { SlotGrid } from '@/components/ui/SlotGrid';
import { TextField } from '@/components/ui/TextField';
import type { DateOnly, Slot } from '@/types/models';
import { useAvailableSlots } from '../queries';

interface WhenPickerProps {
  serviceId: string;
  /** Only this staff member's times; '' for anyone who offers the service. */
  staffId: string;
  /** When rescheduling: treat the appointment's current time as free. */
  ignoreAppointmentId?: string;
  date: DateOnly;
  onDateChange: (date: DateOnly) => void;
  /** starts_at of the chosen slot, or ''. */
  selectedSlot: string;
  onSelectSlot: (slot: Slot) => void;
  /** True when booking at a typed time outside working hours. */
  ignoreSchedule: boolean;
  onIgnoreScheduleChange: (ignoreSchedule: boolean) => void;
  manualTimeProps: UseFormRegisterReturn;
  today: DateOnly;
  slotError?: string;
  manualTimeError?: string;
}

/**
 * Picks the day (week strip) and time: a free slot, or, via "Book outside working hours", a
 * typed time for walk-ins. Double booking is refused either way.
 */
export function WhenPicker({
  serviceId,
  staffId,
  ignoreAppointmentId,
  date,
  onDateChange,
  selectedSlot,
  onSelectSlot,
  ignoreSchedule,
  onIgnoreScheduleChange,
  manualTimeProps,
  today,
  slotError,
  manualTimeError,
}: WhenPickerProps) {
  const slotsQuery = useAvailableSlots(
    serviceId && !ignoreSchedule
      ? {
          service_id: serviceId,
          date,
          staff_id: staffId || undefined,
          ignore_appointment_id: ignoreAppointmentId,
        }
      : null,
  );

  return (
    <div className="space-y-5">
      <DayStrip value={date} onChange={onDateChange} today={today} />

      {ignoreSchedule ? (
        <div className="space-y-2 rounded-lg border border-amber-200 bg-amber-50/60 p-4">
          <TextField
            label="Start time"
            type="time"
            step={300}
            hint="Any time, even outside working hours. Overlapping appointments are still refused."
            error={manualTimeError}
            className="max-w-56"
            {...manualTimeProps}
          />
          <ModeLink onClick={() => onIgnoreScheduleChange(false)}>← Back to free times</ModeLink>
        </div>
      ) : !serviceId ? (
        <p className="rounded-lg border border-dashed border-slate-300 px-4 py-6 text-center text-sm text-slate-500">
          Choose a service to see free times.
        </p>
      ) : (
        <div className="space-y-3">
          <SlotGrid
            slots={slotsQuery.data}
            isLoading={slotsQuery.isFetching && !slotsQuery.data}
            error={slotsQuery.error}
            value={selectedSlot}
            onChange={onSelectSlot}
          />
          {slotError && (
            <p role="alert" className="text-xs font-medium text-red-600">
              {slotError}
            </p>
          )}
          <ModeLink onClick={() => onIgnoreScheduleChange(true)}>
            Walk-in or special case? Book outside working hours
          </ModeLink>
        </div>
      )}
    </div>
  );
}

function ModeLink({ onClick, children }: { onClick: () => void; children: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-sm font-medium text-brand-700 hover:underline"
    >
      {children}
    </button>
  );
}
