import { zodResolver } from '@hookform/resolvers/zod';
import { useMemo, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { useToast } from '@/components/toast/use-toast';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import { FormSection } from '@/components/ui/FormSection';
import { LoadingBlock } from '@/components/ui/QueryStatus';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { SelectField } from '@/components/ui/SelectField';
import { TextAreaField } from '@/components/ui/TextAreaField';
import { TextField } from '@/components/ui/TextField';
import { useAllServices } from '@/features/services/queries';
import { formatShortDate, formatTimeInZone, formatTimeOfDay } from '@/lib/date';
import { formatDuration } from '@/lib/durations';
import { formatPrice } from '@/lib/money';
import { fullName } from '@/lib/names';
import type { Customer, Service } from '@/types/models';
import { useCreateAppointment } from '../queries';
import {
  emptyNewAppointmentValues,
  newAppointmentSchema,
  slotFields,
  toCreateAppointmentRequest,
  type NewAppointmentFormValues,
} from '../schemas';
import { CustomerSearch } from './CustomerSearch';
import { WhenPicker } from './WhenPicker';

const CUSTOMER_MODES = [
  { value: 'existing', label: 'Returning customer' },
  { value: 'new', label: 'New customer' },
] as const;

interface NewAppointmentDialogProps {
  open: boolean;
  onClose: () => void;
  /** Pre-selected date (the day being viewed). */
  date: string;
  today: string;
  timeZone: string;
  currency: string;
}

export function NewAppointmentDialog({ open, onClose, ...formProps }: NewAppointmentDialogProps) {
  return (
    <Dialog open={open} onClose={onClose} title="New appointment" size="lg">
      {/* Mounted only while open, so each booking starts from a clean form. */}
      <NewAppointmentForm {...formProps} onDone={onClose} />
    </Dialog>
  );
}

interface NewAppointmentFormProps extends Omit<NewAppointmentDialogProps, 'open' | 'onClose'> {
  onDone: () => void;
}

function NewAppointmentForm({ date, today, timeZone, currency, onDone }: NewAppointmentFormProps) {
  const toast = useToast();
  const servicesQuery = useAllServices();
  const createMutation = useCreateAppointment();
  const [chosenCustomer, setChosenCustomer] = useState<Customer | null>(null);
  const [showNotes, setShowNotes] = useState(false);

  const {
    register,
    control,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<NewAppointmentFormValues>({
    resolver: zodResolver(newAppointmentSchema),
    defaultValues: emptyNewAppointmentValues(date),
  });

  const [
    serviceId,
    staffId,
    selectedDate,
    slotStartsAt,
    ignoreSchedule,
    manualTime,
    customerMode,
    newFirstName,
    newLastName,
  ] = useWatch({
    control,
    name: [
      'service_id',
      'staff_id',
      'date',
      'slot_starts_at',
      'ignore_schedule',
      'manual_time',
      'customer_mode',
      'new_customer.first_name',
      'new_customer.last_name',
    ],
  });

  const bookableServices = useMemo(
    () =>
      (servicesQuery.data?.data ?? []).filter(
        (service) => service.is_active && activeProviders(service).length > 0,
      ),
    [servicesQuery.data],
  );
  const service = bookableServices.find((candidate) => candidate.id === serviceId);
  const staffOptions = service ? activeProviders(service) : [];

  /** A different service, person, day or mode makes the chosen slot meaningless. */
  const clearSlot = () => {
    setValue('slot_starts_at', '');
    setValue('slot_staff_ids', []);
  };

  const onSubmit = handleSubmit((values) =>
    createMutation.mutate(toCreateAppointmentRequest(values, timeZone), {
      onSuccess: (appointment) => {
        toast.success(
          `Booked ${appointment.service.name} for ${fullName(appointment.customer)} at ${formatTimeInZone(appointment.starts_at, timeZone)}`,
        );
        onDone();
      },
    }),
  );

  if (servicesQuery.isPending) return <LoadingBlock label="Loading services" />;
  if (bookableServices.length === 0) {
    return (
      <p className="text-sm text-slate-600">
        There is nothing to book yet. Add an active service and choose who offers it on the Services
        page first.
      </p>
    );
  }

  // One line describing what is about to be booked, filled in as the form is completed.
  const time = ignoreSchedule
    ? manualTime && formatTimeOfDay(manualTime)
    : slotStartsAt && formatTimeInZone(slotStartsAt, timeZone);
  const customerName =
    customerMode === 'existing'
      ? chosenCustomer && fullName(chosenCustomer)
      : `${newFirstName} ${newLastName}`.trim();
  const summary = [
    service?.name,
    time ? `${formatShortDate(selectedDate)} at ${time}` : null,
    customerName || null,
  ].filter(Boolean);

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-7">
      <ErrorAlert error={createMutation.error} />

      <FormSection step={1} title="Service">
        <div className="grid gap-4 sm:grid-cols-2">
          <SelectField
            label="Service"
            placeholder="Choose a service"
            options={bookableServices.map((option) => ({
              value: option.id,
              label: `${option.name} · ${formatDuration(option.duration_minutes)} · ${formatPrice(option.price, currency)}`,
            }))}
            error={errors.service_id?.message}
            {...register('service_id', {
              onChange: () => {
                setValue('staff_id', '');
                clearSlot();
              },
            })}
          />
          <SelectField
            label="With"
            options={[
              { value: '', label: ignoreSchedule ? 'Choose a staff member' : 'Anyone available' },
              ...staffOptions.map((member) => ({ value: member.id, label: fullName(member) })),
            ]}
            disabled={!service}
            error={errors.staff_id?.message}
            {...register('staff_id', { onChange: clearSlot })}
          />
        </div>
      </FormSection>

      <FormSection step={2} title="When">
        <WhenPicker
          serviceId={serviceId}
          staffId={staffId}
          date={selectedDate}
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
      </FormSection>

      <FormSection step={3} title="Customer">
        <div className="space-y-4">
          <SegmentedControl
            label="Customer"
            options={CUSTOMER_MODES}
            value={customerMode}
            onChange={(mode) => setValue('customer_mode', mode)}
          />

          {customerMode === 'existing' ? (
            <CustomerSearch
              value={chosenCustomer}
              onChange={(customer) => {
                setChosenCustomer(customer);
                setValue('customer_id', customer?.id ?? '', { shouldValidate: Boolean(customer) });
              }}
              error={errors.customer_id?.message}
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField
                label="First name"
                error={errors.new_customer?.first_name?.message}
                {...register('new_customer.first_name')}
              />
              <TextField
                label="Last name"
                error={errors.new_customer?.last_name?.message}
                {...register('new_customer.last_name')}
              />
              <TextField
                label="WhatsApp number"
                type="tel"
                placeholder="+91 98765 43210"
                hint="With country code. Reminders will go here."
                error={errors.new_customer?.phone?.message}
                {...register('new_customer.phone')}
              />
              <TextField
                label="Email"
                type="email"
                optional
                error={errors.new_customer?.email?.message}
                {...register('new_customer.email')}
              />
            </div>
          )}

          {showNotes ? (
            <TextAreaField
              label="Note"
              optional
              rows={2}
              autoFocus
              error={errors.notes?.message}
              {...register('notes')}
            />
          ) : (
            <button
              type="button"
              onClick={() => setShowNotes(true)}
              className="text-sm font-medium text-brand-700 hover:underline"
            >
              + Add a note
            </button>
          )}
        </div>
      </FormSection>

      <div className="-mx-6 -mb-6 flex flex-col gap-3 rounded-b-xl border-t border-slate-200 bg-slate-50 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="min-w-0 truncate text-sm text-slate-600">
          {summary.length > 0 ? summary.join(' · ') : 'Choose a service, a time and a customer'}
        </p>
        <div className="flex shrink-0 justify-end gap-3">
          <Button variant="ghost" onClick={onDone} disabled={createMutation.isPending}>
            Cancel
          </Button>
          <Button type="submit" isLoading={createMutation.isPending}>
            Book appointment
          </Button>
        </div>
      </div>
    </form>
  );
}

/** Active staff who offer the service. */
function activeProviders(service: Service) {
  return service.staff.filter((member) => member.status === 'active');
}
