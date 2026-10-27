import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { useToast } from '@/components/toast/use-toast';
import { Button } from '@/components/ui/Button';
import { Checkbox } from '@/components/ui/Checkbox';
import { CheckboxList, type CheckboxListOption } from '@/components/ui/CheckboxList';
import { Dialog, DialogActions } from '@/components/ui/Dialog';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import { LoadingBlock } from '@/components/ui/QueryStatus';
import { TextAreaField } from '@/components/ui/TextAreaField';
import { TextField } from '@/components/ui/TextField';
import { useStaffMembers } from '@/features/staff/queries';
import { isApiErrorWithStatus } from '@/lib/api/api-error';
import { fullName } from '@/lib/names';
import type { Service, User } from '@/types/models';
import { useCreateService, useUpdateService } from '../queries';
import {
  SERVICE_MAX_MINUTES,
  SERVICE_MIN_MINUTES,
  emptyServiceFormValues,
  serviceFormSchema,
  toServiceFormValues,
  toServiceRequest,
  type ServiceFormValues,
} from '../schemas';

/** The API caps page size at 100; a business with more staff than that is far off. */
const ALL_STAFF = { page: 1, take: 100, order: 'asc' } as const;

interface ServiceFormDialogProps {
  open: boolean;
  /** The service to edit, or null to create a new one. */
  service: Service | null;
  currency: string;
  onClose: () => void;
}

export function ServiceFormDialog({ open, service, currency, onClose }: ServiceFormDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={service ? `Edit ${service.name}` : 'Add a service'}
      description="Customers pick a service when they book. Its duration decides how long the slot is."
    >
      {/* Mounted only while open, so the form starts from the right values each time. */}
      <ServiceForm service={service} currency={currency} onDone={onClose} />
    </Dialog>
  );
}

interface ServiceFormProps {
  service: Service | null;
  currency: string;
  onDone: () => void;
}

function ServiceForm({ service, currency, onDone }: ServiceFormProps) {
  const toast = useToast();
  const staffQuery = useStaffMembers(ALL_STAFF);
  const createMutation = useCreateService();
  const updateMutation = useUpdateService();
  const saveMutation = service ? updateMutation : createMutation;

  const {
    register,
    handleSubmit,
    control,
    setError,
    formState: { errors },
  } = useForm<ServiceFormValues>({
    resolver: zodResolver(serviceFormSchema),
    defaultValues: service ? toServiceFormValues(service) : emptyServiceFormValues(),
  });

  const onSubmit = handleSubmit((values) => {
    const request = toServiceRequest(values);
    const callbacks = {
      onSuccess: () => {
        toast.success(service ? 'Service updated' : 'Service added');
        onDone();
      },
      onError: (error: unknown) => {
        // 409: another service already has this name.
        if (isApiErrorWithStatus(error, 409)) setError('name', { message: error.message });
      },
    };
    if (service) updateMutation.mutate({ serviceId: service.id, request }, callbacks);
    else createMutation.mutate(request, callbacks);
  });

  const formError = isApiErrorWithStatus(saveMutation.error, 409) ? null : saveMutation.error;

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <ErrorAlert error={formError} />

      <TextField
        label="Name"
        autoFocus
        placeholder="e.g. Haircut"
        error={errors.name?.message}
        {...register('name')}
      />
      <TextAreaField
        label="Description"
        optional
        rows={2}
        error={errors.description?.message}
        {...register('description')}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          label="Duration (minutes)"
          type="number"
          inputMode="numeric"
          min={SERVICE_MIN_MINUTES}
          max={SERVICE_MAX_MINUTES}
          step={5}
          error={errors.duration_minutes?.message}
          {...register('duration_minutes')}
        />
        <TextField
          label={`Price (${currency})`}
          type="number"
          inputMode="decimal"
          min={0}
          step="0.01"
          placeholder="450"
          error={errors.price?.message}
          {...register('price')}
        />
      </div>

      <Checkbox
        label="Active"
        description="Inactive services are kept but can't be booked."
        {...register('is_active')}
      />

      {staffQuery.isPending ? (
        <LoadingBlock label="Loading staff" />
      ) : (
        <Controller
          control={control}
          name="staff_ids"
          render={({ field }) => (
            <CheckboxList
              legend="Who offers this service"
              options={toStaffOptions(staffQuery.data?.data ?? [], field.value)}
              value={field.value}
              onChange={field.onChange}
              emptyMessage="Couldn't load your staff."
              error={errors.staff_ids?.message}
            />
          )}
        />
      )}

      <DialogActions>
        <Button variant="secondary" onClick={onDone} disabled={saveMutation.isPending}>
          Cancel
        </Button>
        <Button type="submit" isLoading={saveMutation.isPending}>
          {service ? 'Save changes' : 'Add service'}
        </Button>
      </DialogActions>
    </form>
  );
}

/** Active staff, plus any disabled member who is already assigned (so they can be removed). */
function toStaffOptions(staff: User[], selectedIds: readonly string[]): CheckboxListOption[] {
  return staff
    .filter((member) => member.status === 'active' || selectedIds.includes(member.id))
    .map((member) => ({
      value: member.id,
      label: fullName(member),
      description: member.status === 'disabled' ? 'Disabled account' : undefined,
    }));
}
