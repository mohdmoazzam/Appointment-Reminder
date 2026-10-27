import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/Button';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import { TextAreaField } from '@/components/ui/TextAreaField';
import { TextField } from '@/components/ui/TextField';
import {
  customerFieldsSchema,
  emptyCustomerFields,
  toCustomerInput,
} from '@/features/customers/schemas';
import { optionalText } from '@/lib/validation';
import type { CustomerInput } from '@/features/appointments/types';

const detailsSchema = z.object({
  customer: customerFieldsSchema,
  notes: optionalText('Notes', 1000),
});

type DetailsFormValues = z.infer<typeof detailsSchema>;

interface DetailsStepProps {
  onSubmit: (details: { customer: CustomerInput; notes?: string }) => void;
  isSubmitting: boolean;
  submitError: unknown;
}

/** Step 3: who is booking. */
export function DetailsStep({ onSubmit, isSubmitting, submitError }: DetailsStepProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<DetailsFormValues>({
    resolver: zodResolver(detailsSchema),
    defaultValues: { customer: emptyCustomerFields(), notes: '' },
  });

  return (
    <form
      noValidate
      className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
      onSubmit={handleSubmit((values) =>
        onSubmit({ customer: toCustomerInput(values.customer), notes: values.notes || undefined }),
      )}
    >
      <ErrorAlert error={submitError} />
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          label="First name"
          autoComplete="given-name"
          autoFocus
          error={errors.customer?.first_name?.message}
          {...register('customer.first_name')}
        />
        <TextField
          label="Last name"
          autoComplete="family-name"
          error={errors.customer?.last_name?.message}
          {...register('customer.last_name')}
        />
      </div>
      <TextField
        label="WhatsApp number"
        type="tel"
        autoComplete="tel"
        placeholder="+91 98765 43210"
        hint="Include your country code, so the business can reach you about this booking."
        error={errors.customer?.phone?.message}
        {...register('customer.phone')}
      />
      <TextField
        label="Email"
        type="email"
        autoComplete="email"
        optional
        error={errors.customer?.email?.message}
        {...register('customer.email')}
      />
      <TextAreaField
        label="Anything we should know?"
        optional
        rows={2}
        error={errors.notes?.message}
        {...register('notes')}
      />
      <Button type="submit" className="h-11 w-full text-base" isLoading={isSubmitting}>
        Confirm booking
      </Button>
      <p className="text-center text-xs text-slate-400">
        Your details are only shared with this business.
      </p>
    </form>
  );
}
