import { zodResolver } from '@hookform/resolvers/zod';
import { useMemo } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { useToast } from '@/components/toast/use-toast';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Card, CardBody, CardFooter, CardHeader } from '@/components/ui/Card';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import { SelectField } from '@/components/ui/SelectField';
import { TextField } from '@/components/ui/TextField';
import { countryName } from '@/lib/countries';
import { BUSINESS_TYPE_OPTIONS } from '@/lib/options';
import { getCurrencyOptions } from '@/lib/money';
import { getTimeZoneOptions } from '@/lib/time-zones';
import type { Business } from '@/types/models';
import { useUpdateBusiness } from '../queries';
import {
  businessProfileSchema,
  toBusinessProfileFormValues,
  toUpdateBusinessRequest,
  type BusinessProfileFormValues,
} from '../schemas';

interface BusinessProfileFormProps {
  business: Business;
  /** Only owners may edit; everyone else sees the form read-only. */
  canEdit: boolean;
}

export function BusinessProfileForm({ business, canEdit }: BusinessProfileFormProps) {
  const toast = useToast();
  const updateMutation = useUpdateBusiness();
  const timeZoneOptions = useMemo(() => getTimeZoneOptions(business.timezone), [business.timezone]);
  const currencyOptions = useMemo(() => getCurrencyOptions(business.currency), [business.currency]);

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors, isDirty },
  } = useForm<BusinessProfileFormValues>({
    resolver: zodResolver(businessProfileSchema),
    defaultValues: toBusinessProfileFormValues(business),
  });

  const country = useWatch({ control, name: 'country' });
  const countryHint = countryName(country ?? '') ?? 'ISO 3166-1 code, e.g. IN for India';

  const onSubmit = handleSubmit((values) =>
    updateMutation.mutate(toUpdateBusinessRequest(values), {
      onSuccess: (saved) => {
        // Re-base the form on what the server saved (it trims and normalises values).
        reset(toBusinessProfileFormValues(saved));
        toast.success('Business details saved');
      },
    }),
  );

  return (
    <Card>
      <CardHeader
        title="Business details"
        description="Shown to your customers on bookings and reminders."
      />
      <form onSubmit={onSubmit} noValidate>
        <CardBody className="space-y-6">
          {!canEdit && <Alert tone="info">Only owners can change business details.</Alert>}
          <ErrorAlert error={updateMutation.error} />

          {/* A disabled fieldset disables every control inside it. */}
          <fieldset disabled={!canEdit} className="space-y-4">
            <TextField label="Business name" error={errors.name?.message} {...register('name')} />
            <div className="grid gap-4 sm:grid-cols-2">
              <SelectField
                label="Business type"
                options={BUSINESS_TYPE_OPTIONS}
                error={errors.type?.message}
                {...register('type')}
              />
              <SelectField
                label="Time zone"
                options={timeZoneOptions}
                hint="Appointments and reminders use this time zone."
                error={errors.timezone?.message}
                {...register('timezone')}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField
                label="Phone"
                type="tel"
                optional
                placeholder="+91 98765 43210"
                error={errors.phone?.message}
                {...register('phone')}
              />
              <SelectField
                label="Currency"
                options={currencyOptions}
                hint="Service prices are in this currency."
                error={errors.currency?.message}
                {...register('currency')}
              />
            </div>
          </fieldset>

          <fieldset disabled={!canEdit} className="space-y-4">
            <legend className="mb-4 text-sm font-semibold text-slate-900">Address</legend>
            <TextField
              label="Address line 1"
              optional
              autoComplete="address-line1"
              error={errors.address_line1?.message}
              {...register('address_line1')}
            />
            <TextField
              label="Address line 2"
              optional
              autoComplete="address-line2"
              error={errors.address_line2?.message}
              {...register('address_line2')}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField
                label="City"
                optional
                autoComplete="address-level2"
                error={errors.city?.message}
                {...register('city')}
              />
              <TextField
                label="State"
                optional
                autoComplete="address-level1"
                error={errors.state?.message}
                {...register('state')}
              />
              <TextField
                label="Postal code"
                optional
                autoComplete="postal-code"
                error={errors.postal_code?.message}
                {...register('postal_code')}
              />
              <TextField
                label="Country"
                optional
                maxLength={2}
                autoComplete="country"
                hint={countryHint}
                error={errors.country?.message}
                {...register('country')}
              />
            </div>
          </fieldset>
        </CardBody>

        {canEdit && (
          <CardFooter>
            <Button
              variant="secondary"
              disabled={!isDirty || updateMutation.isPending}
              onClick={() => reset(toBusinessProfileFormValues(business))}
            >
              Discard changes
            </Button>
            <Button type="submit" disabled={!isDirty} isLoading={updateMutation.isPending}>
              Save changes
            </Button>
          </CardFooter>
        )}
      </form>
    </Card>
  );
}
