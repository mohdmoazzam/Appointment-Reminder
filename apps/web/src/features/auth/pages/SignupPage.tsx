import { zodResolver } from '@hookform/resolvers/zod';
import { useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router';
import { paths } from '@/app/paths';
import { Button } from '@/components/ui/Button';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import { SelectField } from '@/components/ui/SelectField';
import { TextField } from '@/components/ui/TextField';
import { isApiErrorWithStatus } from '@/lib/api/api-error';
import { useDocumentTitle } from '@/lib/hooks/use-document-title';
import { BUSINESS_TYPE_OPTIONS } from '@/lib/options';
import { detectTimeZone, getTimeZoneOptions } from '@/lib/time-zones';
import { PASSWORD_MIN_LENGTH } from '@/lib/validation';
import { AuthLayout } from '../components/AuthLayout';
import { useSignup } from '../queries';
import { signupSchema, toSignupRequest, type SignupFormValues } from '../schemas';

/** Creates the business and its owner. RequireGuest (the parent route) redirects afterwards. */
export function SignupPage() {
  useDocumentTitle('Create your account');
  const signupMutation = useSignup();
  const timeZoneOptions = useMemo(() => getTimeZoneOptions(), []);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      business_name: '',
      timezone: detectTimeZone(),
      phone: '',
      first_name: '',
      last_name: '',
      email: '',
      password: '',
      confirm_password: '',
    },
  });

  const onSubmit = handleSubmit((values) =>
    signupMutation.mutate(toSignupRequest(values), {
      onError: (error) => {
        // 409: the email is taken. Show it on the field rather than at the top of the form.
        if (isApiErrorWithStatus(error, 409)) setError('email', { message: error.message });
      },
    }),
  );

  // A 409 is shown on the email field (above); everything else at the top of the form.
  const formError = isApiErrorWithStatus(signupMutation.error, 409) ? null : signupMutation.error;

  return (
    <AuthLayout
      wide
      title="Create your business account"
      description="Set up your business and your owner account. You can invite your team afterwards."
      footer={
        <>
          Already have an account?{' '}
          <Link to={paths.login} className="font-medium text-brand-600 hover:text-brand-700">
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} noValidate className="space-y-8">
        <ErrorAlert error={formError} />

        <fieldset className="space-y-4">
          <legend className="mb-4 text-sm font-semibold text-slate-900">Your business</legend>
          <TextField
            label="Business name"
            autoComplete="organization"
            autoFocus
            error={errors.business_name?.message}
            {...register('business_name')}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <SelectField
              label="Business type"
              placeholder="Select a type"
              options={BUSINESS_TYPE_OPTIONS}
              error={errors.business_type?.message}
              {...register('business_type')}
            />
            <SelectField
              label="Time zone"
              options={timeZoneOptions}
              hint="Appointments and reminders use this time zone."
              error={errors.timezone?.message}
              {...register('timezone')}
            />
          </div>
          <TextField
            label="Business phone"
            type="tel"
            autoComplete="tel"
            optional
            placeholder="+91 98765 43210"
            error={errors.phone?.message}
            {...register('phone')}
          />
        </fieldset>

        <fieldset className="space-y-4">
          <legend className="mb-4 text-sm font-semibold text-slate-900">Your account</legend>
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField label="First name" autoComplete="given-name" error={errors.first_name?.message} {...register('first_name')} />
            <TextField label="Last name" autoComplete="family-name" error={errors.last_name?.message} {...register('last_name')} />
          </div>
          <TextField label="Email" type="email" autoComplete="email" error={errors.email?.message} {...register('email')} />
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField
              label="Password"
              type="password"
              autoComplete="new-password"
              hint={`At least ${PASSWORD_MIN_LENGTH} characters.`}
              error={errors.password?.message}
              {...register('password')}
            />
            <TextField
              label="Confirm password"
              type="password"
              autoComplete="new-password"
              error={errors.confirm_password?.message}
              {...register('confirm_password')}
            />
          </div>
        </fieldset>

        <Button type="submit" className="w-full" isLoading={signupMutation.isPending}>
          Create account
        </Button>
      </form>
    </AuthLayout>
  );
}
