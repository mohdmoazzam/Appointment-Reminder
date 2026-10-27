import { zodResolver } from '@hookform/resolvers/zod';
import { useId } from 'react';
import { useForm } from 'react-hook-form';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import { controlStyles } from '@/components/ui/field-styles';
import { TextField } from '@/components/ui/TextField';
import { formatRelative } from '@/lib/date';
import { PASSWORD_MIN_LENGTH } from '@/lib/validation';
import { USER_ROLE_LABELS } from '@/types/enums';
import { acceptInviteSchema, toAcceptInviteRequest, type AcceptInviteFormValues } from '../schemas';
import type { AcceptInviteRequest, InvitePreview } from '../types';

interface AcceptInviteFormProps {
  invite: InvitePreview;
  onSubmit: (request: AcceptInviteRequest) => void;
  isSubmitting: boolean;
  submitError: unknown;
}

/** Sets the password (and optionally corrects the name) for an invited staff member. */
export function AcceptInviteForm({
  invite,
  onSubmit,
  isSubmitting,
  submitError,
}: AcceptInviteFormProps) {
  const emailId = useId();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<AcceptInviteFormValues>({
    resolver: zodResolver(acceptInviteSchema),
    defaultValues: {
      first_name: invite.first_name,
      last_name: invite.last_name,
      password: '',
      confirm_password: '',
    },
  });

  return (
    <form
      onSubmit={handleSubmit((values) => onSubmit(toAcceptInviteRequest(values)))}
      noValidate
      className="space-y-4"
    >
      <ErrorAlert error={submitError} />

      <div className="space-y-1.5">
        <label htmlFor={emailId} className="block text-sm font-medium text-slate-700">
          Email
        </label>
        <input
          id={emailId}
          value={invite.email}
          readOnly
          disabled
          className={controlStyles(false)}
        />
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
          You&apos;ll join as <Badge tone="brand">{USER_ROLE_LABELS[invite.role]}</Badge>
          <span>· Invite expires {formatRelative(invite.expires_at)}</span>
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          label="First name"
          autoComplete="given-name"
          error={errors.first_name?.message}
          {...register('first_name')}
        />
        <TextField
          label="Last name"
          autoComplete="family-name"
          error={errors.last_name?.message}
          {...register('last_name')}
        />
      </div>
      <TextField
        label="Password"
        type="password"
        autoComplete="new-password"
        autoFocus
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

      <Button type="submit" className="w-full" isLoading={isSubmitting}>
        Join {invite.business.name}
      </Button>
    </form>
  );
}
