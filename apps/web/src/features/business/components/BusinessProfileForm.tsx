import { zodResolver } from '@hookform/resolvers/zod';
import { useMemo } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { useToast } from '@/components/toast/use-toast';
import { Alert } from '@/components/ui/Alert';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import { SaveBar } from '@/components/ui/SaveBar';
import { SelectField } from '@/components/ui/SelectField';
import { SettingsSection } from '@/components/ui/SettingsSection';
import { TextField } from '@/components/ui/TextField';
import { countryName } from '@/lib/countries';
import { getCurrencyOptions } from '@/lib/money';
import { BUSINESS_TYPE_OPTIONS } from '@/lib/options';
import { getTimeZoneOptions } from '@/lib/time-zones';
import type { Business } from '@/types/models';
import { useUpdateBusiness } from '../queries';
import { businessProfileSchema, toBusinessProfileFormValues, toUpdateBusinessRequest, type BusinessProfileFormValues } from '../schemas';

interface BusinessProfileFormProps {
  business: Business;
  /** Only owners may edit; everyone else sees the form read-only. */
  canEdit: boolean;
}

/** The business profile as grouped settings, saved with a floating bar when something changed. */
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
  const countryHint = countryName(country ?? '') ?? 'Two-letter code, e.g. IN for India';

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
    <form onSubmit={onSubmit} noValidate>
      {!canEdit && (
        <Alert tone="info" className="mb-6">
          Only owners can change business details.
        </Alert>
      )}
      <ErrorAlert error={updateMutation.error} className="mb-6" />

      {/* A disabled fieldset disables every control inside it. */}
      <fieldset disabled={!canEdit} className="space-y-8">
        <SettingsSection title="Basics" description="How your business appears to customers.">
          <TextField label="Business name" error={errors.name?.message} {...register('name')} />
          <SelectField label="Business type" options={BUSINESS_TYPE_OPTIONS} error={errors.type?.message} {...register('type')} />
        </SettingsSection>

        <SettingsSection title="Time & money" description="Appointments, reminders and prices use these.">
          <div className="grid gap-4 sm:grid-cols-2">
            <SelectField label="Time zone" options={timeZoneOptions} error={errors.timezone?.message} {...register('timezone')} />
            <SelectField label="Currency" options={currencyOptions} error={errors.currency?.message} {...register('currency')} />
          </div>
        </SettingsSection>

        <SettingsSection title="Contact" description="Shown on your booking page so customers can call.">
          <TextField label="Phone" type="tel" optional placeholder="+91 98765 43210" error={errors.phone?.message} {...register('phone')} />
        </SettingsSection>

        <SettingsSection title="Address" description="Where customers come for their appointment.">
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
            <TextField label="City" optional autoComplete="address-level2" error={errors.city?.message} {...register('city')} />
            <TextField label="State" optional autoComplete="address-level1" error={errors.state?.message} {...register('state')} />
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
        </SettingsSection>
      </fieldset>

      <SaveBar
        visible={canEdit && isDirty}
        isSaving={updateMutation.isPending}
        onDiscard={() => reset(toBusinessProfileFormValues(business))}
      />
    </form>
  );
}
