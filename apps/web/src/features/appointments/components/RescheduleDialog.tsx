import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useWatch } from 'react-hook-form';
import { useToast } from '@/components/toast/use-toast';
import { Button } from '@/components/ui/Button';
import { Dialog, DialogActions } from '@/components/ui/Dialog';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import { SelectField } from '@/components/ui/SelectField';
import { useAllServices } from '@/features/services/queries';
import { dateInZone, formatLongDate, formatTimeInZone } from '@/lib/date';
import { fullName } from '@/lib/names';
import type { Appointment } from '@/types/models';
import { useRescheduleAppointment } from '../queries';
import {
  rescheduleSchema,
  slotFields,
  toRescheduleRequest,
  type RescheduleFormValues,
} from '../schemas';
import { WhenPicker } from './WhenPicker';

interface RescheduleDialogProps {
  /** The appointment to move, or null when closed. */
  appointment: Appointment | null;
  onClose: () => void;
  today: string;
  timeZone: string;
}

export function RescheduleDialog({ appointment, onClose, today, timeZone }: RescheduleDialogProps) {
  return (
    <Dialog
      open={appointment !== null}
      onClose={onClose}
      size="lg"
      title="Reschedule appointment"
      description={
        appointment &&
        `${appointment.service.name} for ${fullName(appointment.customer)}, now ${formatLongDate(dateInZone(appointment.starts_at, timeZone))} at ${formatTimeInZone(appointment.starts_at, timeZone)}`
      }
    >
      {appointment && (
        <RescheduleForm
          appointment={appointment}
          today={today}
          timeZone={timeZone}
          onDone={onClose}
        />
      )}
    </Dialog>
  );
}

interface RescheduleFormProps {
  appointment: Appointment;
  today: string;
  timeZone: string;
  onDone: () => void;
}

function RescheduleForm({ appointment, today, timeZone, onDone }: RescheduleFormProps) {
  const toast = useToast();
  const servicesQuery = useAllServices();
  const rescheduleMutation = useRescheduleAppointment();

  const {
    register,
    control,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<RescheduleFormValues>({
    resolver: zodResolver(rescheduleSchema),
    defaultValues: {
      staff_id: appointment.staff.id,
      date: dateInZone(appointment.starts_at, timeZone),
      slot_starts_at: '',
      slot_staff_ids: [],
      ignore_schedule: false,
      manual_time: '',
    },
  });
  const [staffId, date, slotStartsAt, ignoreSchedule] = useWatch({
    control,
    name: ['staff_id', 'date', 'slot_starts_at', 'ignore_schedule'],
  });

  // Who can take it: active staff offering the service, plus the current staff member.
  const service = servicesQuery.data?.data.find(
    (candidate) => candidate.id === appointment.service.id,
  );
  const providers = (service?.staff ?? []).filter((member) => member.status === 'active');
  if (!providers.some((member) => member.id === appointment.staff.id))
    providers.unshift(appointment.staff);

  const clearSlot = () => {
    setValue('slot_starts_at', '');
    setValue('slot_staff_ids', []);
  };

  const onSubmit = handleSubmit((values) =>
    rescheduleMutation.mutate(
      { appointmentId: appointment.id, request: toRescheduleRequest(values, timeZone) },
      {
        onSuccess: (moved) => {
          toast.success(
            `Moved to ${formatLongDate(dateInZone(moved.starts_at, timeZone))} at ${formatTimeInZone(moved.starts_at, timeZone)}`,
          );
          onDone();
        },
      },
    ),
  );

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      <ErrorAlert error={rescheduleMutation.error} />
      <SelectField
        label="Staff"
        options={providers.map((member) => ({ value: member.id, label: fullName(member) }))}
        error={errors.staff_id?.message}
        {...register('staff_id', { onChange: clearSlot })}
      />
      <WhenPicker
        serviceId={appointment.service.id}
        staffId={staffId}
        ignoreAppointmentId={appointment.id}
        date={date}
        onDateChange={(next) => {
          setValue('date', next);
          clearSlot();
        }}
        selectedSlot={slotStartsAt}
        onSelectSlot={(slot) => {
          const fields = slotFields(slot);
          setValue('slot_starts_at', fields.slot_starts_at, { shouldValidate: true });
          setValue('slot_staff_ids', fields.slot_staff_ids);
        }}
        ignoreSchedule={ignoreSchedule}
        onIgnoreScheduleChange={(next) => {
          setValue('ignore_schedule', next);
          clearSlot();
        }}
        manualTimeProps={register('manual_time')}
        today={today}
        slotError={errors.slot_starts_at?.message}
        manualTimeError={errors.manual_time?.message}
      />
      <DialogActions>
        <Button variant="secondary" onClick={onDone} disabled={rescheduleMutation.isPending}>
          Cancel
        </Button>
        <Button type="submit" isLoading={rescheduleMutation.isPending}>
          Move appointment
        </Button>
      </DialogActions>
    </form>
  );
}
